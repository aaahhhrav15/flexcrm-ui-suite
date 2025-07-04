const PersonalTrainingAssignment = require('../models/PersonalTrainingAssignment');
const Customer = require('../models/Customer');
const Trainer = require('../models/Trainer');
const Invoice = require('../models/Invoice');
const Transaction = require('../models/Transaction');

// List all assignments for a gym
exports.getAssignments = async (req, res) => {
  try {
    const { gymId } = req.query;
    const assignments = await PersonalTrainingAssignment.find(gymId ? { gymId } : {})
      .populate('customerId', 'name email')
      .populate('trainerId', 'name email');
    res.json(assignments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Create a new assignment
exports.createAssignment = async (req, res) => {
  try {
    const { customerId, trainerId, gymId, startDate, duration, fees } = req.body;
    if (!customerId || !trainerId || !gymId || !startDate || !duration || !fees) {
      return res.status(400).json({ error: 'All fields are required.' });
    }

    // Calculate end date
    const start = new Date(startDate);
    const end = new Date(start);
    end.setMonth(end.getMonth() + Number(duration));
    end.setDate(end.getDate() - 1); // End date is the day before the same date next period

    // Create the assignment
    const assignment = new PersonalTrainingAssignment({
      customerId,
      trainerId,
      gymId,
      startDate: start,
      duration,
      endDate: end,
      fees
    });
    await assignment.save();

    // Populate trainer details
    const populatedAssignment = await PersonalTrainingAssignment.findById(assignment._id)
      .populate('trainerId', 'name email phone dateOfBirth specialization experience status bio clients gymId');

    // Update customer's personalTrainer field with full assignment
    await Customer.findByIdAndUpdate(customerId, {
      personalTrainer: populatedAssignment
    });

    // Generate invoice for personal training
    const invoice = new Invoice({
      userId: req.user._id, // User ID from auth middleware
      gymId,
      customerId,
      amount: fees,
      currency: 'INR',
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      items: [{
        description: `Personal Training with ${duration} month(s) duration`,
        quantity: 1,
        unitPrice: fees,
        amount: fees
      }],
      notes: `Personal training assignment starting ${start.toLocaleDateString()}`
    });
    await invoice.save();

    // Create transaction record
    const transaction = new Transaction({
      userId: customerId, // Set to customerId so transactions are linked to the customer
      gymId,
      invoiceId: invoice._id,
      transactionType: 'PERSONAL_TRAINING',
      transactionDate: new Date(),
      amount: fees,
      paymentMode: 'cash', // Default payment mode
      description: `Personal training fees for ${duration} month(s)`,
      status: 'SUCCESS'
    });
    await transaction.save();

    // Update customer's totalSpent
    await Customer.findByIdAndUpdate(customerId, {
      $inc: { totalSpent: fees }
    });

    res.status(201).json({
      assignment: populatedAssignment,
      invoice: invoice,
      transaction: transaction
    });
  } catch (err) {
    console.error('Error creating assignment:', err);
    res.status(500).json({ error: err.message });
  }
};

// Update an assignment
exports.updateAssignment = async (req, res) => {
  try {
    const { id } = req.params;
    const { customerId, trainerId, gymId, startDate, duration, fees } = req.body;
    
    if (!customerId || !trainerId || !gymId || !startDate || !duration || !fees) {
      return res.status(400).json({ error: 'All fields are required.' });
    }

    const start = new Date(startDate);
    const end = new Date(start);
    end.setMonth(end.getMonth() + Number(duration));
    end.setDate(end.getDate() - 1); // End date is the day before the same date next period

    const assignment = await PersonalTrainingAssignment.findByIdAndUpdate(
      id,
      {
        customerId,
        trainerId,
        gymId,
        startDate: start,
        duration,
        endDate: end,
        fees
      },
      { new: true }
    ).populate('customerId', 'name email phone')
     .populate('trainerId', 'name email');

    if (!assignment) {
      return res.status(404).json({ error: 'Assignment not found.' });
    }

    // Update customer's personalTrainer field with full assignment
    await Customer.findByIdAndUpdate(customerId, {
      personalTrainer: assignment
    });

    // Update the most recent related invoice (if any)
    const invoice = await Invoice.findOne({
      customerId,
      gymId,
      'items.description': /Personal Training/
    }).sort({ createdAt: -1 });
    if (invoice) {
      invoice.amount = fees;
      invoice.dueDate = end;
      invoice.items = [{
        description: `Personal Training with ${duration} month(s) duration`,
        quantity: 1,
        unitPrice: fees,
        amount: fees
      }];
      invoice.notes = `Personal training assignment starting ${start.toLocaleDateString()}`;
      await invoice.save();
    }

    // Update the most recent related transaction (if any)
    const transaction = await Transaction.findOne({
      userId: customerId,
      gymId,
      transactionType: 'PERSONAL_TRAINING'
    }).sort({ createdAt: -1 });
    if (transaction) {
      transaction.amount = fees;
      transaction.description = `Personal training fees for ${duration} month(s)`;
      transaction.transactionDate = new Date();
      await transaction.save();
    }

    res.json(assignment);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Delete an assignment
exports.deleteAssignment = async (req, res) => {
  try {
    const { id } = req.params;
    const assignment = await PersonalTrainingAssignment.findById(id);
    
    if (!assignment) {
      return res.status(404).json({ error: 'Assignment not found.' });
    }

    // Remove personalTrainer from customer
    await Customer.findByIdAndUpdate(assignment.customerId, {
      $unset: { personalTrainer: 1 }
    });

    // Delete all related invoices
    await Invoice.deleteMany({
      customerId: assignment.customerId,
      gymId: assignment.gymId,
      'items.description': /Personal Training/
    });

    // Delete all related transactions
    await Transaction.deleteMany({
      userId: assignment.customerId,
      gymId: assignment.gymId,
      transactionType: { $in: ['PERSONAL_TRAINING', 'PERSONAL_TRAINING_RENEWAL'] }
    });

    // Delete the assignment
    await PersonalTrainingAssignment.findByIdAndDelete(id);

    res.json({ message: 'Assignment deleted successfully.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Renew an assignment
exports.renewAssignment = async (req, res) => {
  try {
    const { id } = req.params;
    const { startDate, duration, endDate, fees, gymId, paymentMode, transactionDate } = req.body;
    if (!startDate || !duration || !endDate || !fees || !gymId) {
      return res.status(400).json({ error: 'All fields are required.' });
    }

    // Update the assignment
    const assignment = await PersonalTrainingAssignment.findByIdAndUpdate(
      id,
      {
        startDate: new Date(startDate),
        duration,
        endDate: new Date(endDate),
        fees
      },
      { new: true }
    ).populate('customerId', 'name email phone')
     .populate('trainerId', 'name email');

    if (!assignment) {
      return res.status(404).json({ error: 'Assignment not found.' });
    }

    // Update customer's personalTrainer field with full assignment
    await Customer.findByIdAndUpdate(assignment.customerId._id || assignment.customerId, {
      personalTrainer: assignment
    });

    // Generate invoice for renewal
    const invoice = new Invoice({
      userId: req.user._id,
      gymId,
      customerId: assignment.customerId._id || assignment.customerId,
      amount: fees,
      currency: 'INR',
      dueDate: new Date(endDate),
      items: [{
        description: `Personal Training Renewal (${duration} month(s))`,
        quantity: duration,
        unitPrice: fees / duration,
        amount: fees
      }],
      notes: `Personal training renewal starting ${new Date(startDate).toLocaleDateString()}`
    });
    await invoice.save();

    // Create transaction record
    const txn = new Transaction({
      userId: assignment.customerId._id || assignment.customerId,
      gymId,
      invoiceId: invoice._id,
      transactionType: 'PERSONAL_TRAINING_RENEWAL',
      transactionDate: transactionDate ? new Date(transactionDate) : new Date(),
      amount: fees,
      paymentMode: paymentMode || 'cash',
      membershipType: 'none',
      description: `Personal training renewal for ${duration} month(s)` ,
      status: 'SUCCESS'
    });
    await txn.save();

    // Update customer's totalSpent
    await Customer.findByIdAndUpdate(assignment.customerId._id || assignment.customerId, {
      $inc: { totalSpent: fees }
    });

    res.status(200).json({
      assignment,
      invoice,
      transaction: txn
    });
  } catch (err) {
    console.error('Error renewing assignment:', err);
    res.status(500).json({ error: err.message });
  }
};

// Get assignments expiring today or in the next 7 days
exports.getExpiringAssignments = async (req, res) => {
  try {
    const { gymId } = req.query;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const sevenDaysFromNow = new Date(today);
    sevenDaysFromNow.setDate(today.getDate() + 7);
    sevenDaysFromNow.setHours(23, 59, 59, 999);
    const filter = {
      endDate: { $gte: today, $lte: sevenDaysFromNow }
    };
    if (gymId) filter.gymId = gymId;
    const assignments = await PersonalTrainingAssignment.find(filter)
      .populate('customerId', 'name email')
      .populate('trainerId', 'name email');
    res.json(assignments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}; 
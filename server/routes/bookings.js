const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { gymAuth } = require('../middleware/gymAuth');
const Booking = require('../models/Booking');
const Customer = require('../models/Customer');
const Invoice = require('../models/Invoice');
const Notification = require('../models/Notification');
const { addDays } = require('date-fns');

// Apply both auth and gymAuth middleware to all routes
router.use(auth);
router.use(gymAuth);

// Get all bookings for the gym
router.get('/', async (req, res) => {
  try {
    const bookings = await Booking.find({ gymId: req.gymId })
      .populate('customerId', 'name email phone')
      .sort({ startTime: -1 });
    res.json({ success: true, bookings });
  } catch (error) {
    console.error('Error fetching bookings:', error);
    res.status(500).json({ success: false, message: 'Error fetching bookings' });
  }
});

// Get booking calendar data
router.get('/calendar', async (req, res) => {
  try {
    const { startDate, endDate, type } = req.query;
    
    const query = { 
      gymId: req.gymId,
      startTime: {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      }
    };

    if (type) query.type = type;

    const bookings = await Booking.find(query)
      .populate('customerId', 'name')
      .populate('trainerId', 'name')
      .populate('classId', 'name')
      .populate('equipmentId', 'name')
      .sort({ startTime: 1 });

    res.json({ success: true, bookings });
  } catch (error) {
    console.error('Get calendar data error:', error);
    res.status(500).json({ success: false, message: 'Error fetching calendar data' });
  }
});

// Get a specific booking
router.get('/:id', async (req, res) => {
  try {
    const booking = await Booking.findOne({
      _id: req.params.id,
      gymId: req.gymId
    }).populate('customerId', 'name email phone');
    
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }
    
    res.json({ success: true, booking });
  } catch (error) {
    console.error('Error fetching booking:', error);
    res.status(500).json({ success: false, message: 'Error fetching booking' });
  }
});

// Create a new booking
router.post('/', async (req, res) => {
  try {
    console.log('Received booking data:', req.body);
    
    // Validate required fields based on booking type
    if (req.body.type === 'class' && !req.body.classId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Class ID is required for class bookings' 
      });
    }
    if (req.body.type === 'personal_training' && !req.body.trainerId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Trainer ID is required for personal training bookings' 
      });
    }
    if (req.body.type === 'equipment' && !req.body.equipmentId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Equipment ID is required for equipment bookings' 
      });
    }

    // Validate dates
    if (!req.body.startTime || !req.body.endTime) {
      return res.status(400).json({ 
        success: false, 
        message: 'Start time and end time are required' 
      });
    }

    // Validate price
    if (typeof req.body.price !== 'number' || req.body.price < 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Price must be a non-negative number' 
      });
    }

    const booking = new Booking({
      ...req.body,
      userId: req.user._id,
      gymId: req.gymId,
      createdBy: req.user._id
    });
    console.log('Created booking object:', booking);
    await booking.save();
    res.status(201).json({ success: true, booking });
  } catch (error) {
    console.error('Error creating booking:', error);
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack,
      code: error.code,
      keyPattern: error.keyPattern,
      keyValue: error.keyValue
    });
    res.status(500).json({ 
      success: false, 
      message: 'Error creating booking',
      error: error.message 
    });
  }
});

// Update a booking
router.put('/:id', async (req, res) => {
  try {
    const booking = await Booking.findOneAndUpdate(
      { _id: req.params.id, gymId: req.gymId },
      req.body,
      { new: true }
    );
    
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }
    
    res.json({ success: true, booking });
  } catch (error) {
    console.error('Error updating booking:', error);
    res.status(500).json({ success: false, message: 'Error updating booking' });
  }
});

// Delete a booking
router.delete('/:id', async (req, res) => {
  try {
    const booking = await Booking.findOneAndDelete({
      _id: req.params.id,
      gymId: req.gymId
    });
    
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }
    
    res.json({ success: true, message: 'Booking deleted successfully' });
  } catch (error) {
    console.error('Error deleting booking:', error);
    res.status(500).json({ success: false, message: 'Error deleting booking' });
  }
});

module.exports = router;

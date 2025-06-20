const express = require('express');
const GymMember = require('../models/GymMember');
const auth = require('../middleware/auth');

const router = express.Router();

// Get all members
router.get('/', auth, async (req, res) => {
  try {
    if (!req.user.gymId) {
      return res.status(400).json({ 
        success: false, 
        message: 'No gym associated with this account' 
      });
    }

    const members = await GymMember.find({ gymId: req.user.gymId });
    res.json({ success: true, data: members });
  } catch (error) {
    console.error('Get members error:', error);
    res.status(500).json({ success: false, message: 'Error fetching members' });
  }
});

// Get single member
router.get('/:id', auth, async (req, res) => {
  try {
    if (!req.user.gymId) {
      return res.status(400).json({ 
        success: false, 
        message: 'No gym associated with this account' 
      });
    }

    const member = await GymMember.findOne({ 
      _id: req.params.id,
      gymId: req.user.gymId 
    });
    
    if (!member) {
      return res.status(404).json({ success: false, message: 'Member not found' });
    }
    
    res.json({ success: true, data: member });
  } catch (error) {
    console.error('Get member error:', error);
    res.status(500).json({ success: false, message: 'Error fetching member' });
  }
});

// Create new member
router.post('/', auth, async (req, res) => {
  try {
    if (!req.user.gymId) {
      return res.status(400).json({ 
        success: false, 
        message: 'No gym associated with this account' 
      });
    }

    const { name, email, phone, membershipType, startDate, endDate, status } = req.body;
    
    const newMember = await GymMember.create({
      gymId: req.user.gymId,
      name,
      email,
      phone,
      membershipType,
      startDate,
      endDate,
      status
    });
    
    res.status(201).json({ success: true, data: newMember });
  } catch (error) {
    console.error('Create member error:', error);
    res.status(500).json({ success: false, message: 'Error creating member' });
  }
});

// Update member
router.put('/:id', auth, async (req, res) => {
  try {
    if (!req.user.gymId) {
      return res.status(400).json({ 
        success: false, 
        message: 'No gym associated with this account' 
      });
    }

    const { name, email, phone, membershipType, startDate, endDate, status } = req.body;
    
    const member = await GymMember.findOneAndUpdate(
      { _id: req.params.id, gymId: req.user.gymId },
      { name, email, phone, membershipType, startDate, endDate, status },
      { new: true, runValidators: true }
    );
    
    if (!member) {
      return res.status(404).json({ success: false, message: 'Member not found' });
    }
    
    res.json({ success: true, data: member });
  } catch (error) {
    console.error('Update member error:', error);
    res.status(500).json({ success: false, message: 'Error updating member' });
  }
});

// Delete member
router.delete('/:id', auth, async (req, res) => {
  try {
    if (!req.user.gymId) {
      return res.status(400).json({ 
        success: false, 
        message: 'No gym associated with this account' 
      });
    }

    const member = await GymMember.findOneAndDelete({ 
      _id: req.params.id,
      gymId: req.user.gymId 
    });
    
    if (!member) {
      return res.status(404).json({ success: false, message: 'Member not found' });
    }
    
    res.json({ success: true, data: {} });
  } catch (error) {
    console.error('Delete member error:', error);
    res.status(500).json({ success: false, message: 'Error deleting member' });
  }
});

module.exports = router;

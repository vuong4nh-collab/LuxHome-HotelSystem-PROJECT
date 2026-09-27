const { HotelChain, Hotel, HotelBranch } = require('../../models');
const { createError } = require('../../middlewares/errorHandler');

const getChains = async (req, res, next) => {
  try {
    const chains = await HotelChain.findAll({ order: [['name', 'ASC']] });
    res.json({ success: true, data: chains });
  } catch (err) { next(err); }
};

const getHotels = async (req, res, next) => {
  try {
    const { chainId, city } = req.query;
    const where = {};
    if (chainId) where.hotel_chain_id = chainId;
    if (city) where.city = city;

    const hotels = await Hotel.findAll({
      where,
      include: [{ model: HotelBranch, as: 'branches' }],
      order: [['name', 'ASC']],
    });
    res.json({ success: true, data: hotels });
  } catch (err) { next(err); }
};

const getBranches = async (req, res, next) => {
  try {
    const { hotelId, city } = req.query;
    const where = {};
    if (hotelId) where.hotel_id = hotelId;
    if (city) where.city = city;

    const branches = await HotelBranch.findAll({
      where,
      include: [{ model: Hotel, as: 'hotel' }],
      order: [['city', 'ASC'], ['name', 'ASC']],
    });
    res.json({ success: true, data: branches });
  } catch (err) { next(err); }
};

const createChain = async (req, res, next) => {
  try {
    const chain = await HotelChain.create(req.body);
    res.status(201).json({ success: true, message: 'Hotel chain created', data: chain });
  } catch (err) { next(err); }
};

const createHotel = async (req, res, next) => {
  try {
    const hotel = await Hotel.create(req.body);
    res.status(201).json({ success: true, message: 'Hotel created', data: hotel });
  } catch (err) { next(err); }
};

const createBranch = async (req, res, next) => {
  try {
    const branch = await HotelBranch.create(req.body);
    res.status(201).json({ success: true, message: 'Hotel branch created', data: branch });
  } catch (err) { next(err); }
};

module.exports = { getChains, getHotels, getBranches, createChain, createHotel, createBranch };

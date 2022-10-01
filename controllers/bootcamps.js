const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middleware/async');
const geocoder = require('../utils/geocoder');
const Bootcamp = require('../models/Bootcamp');
const path = require('path');

// @desc    Get all bootcamps
// @route   GET /api/v1/bootcamps
// @access  Public
exports.getBootcamps = asyncHandler(async (req, res, next) => {
  res.status(200).json(res.advancedResults);
});

// @desc    Get single bootcamp
// @route   GET /api/v1/bootcamp/:id
// @access  Public
exports.getBootcamp = asyncHandler(async (req, res, next) => {
  const bootcamp = await Bootcamp.findById(req.params.id);
  if (!bootcamp) {
    next(
      new ErrorResponse(`Bootcamp not found with id of ${req.params.id}`, 404)
    );
  } else {
    res.status(200).json({
      success: true,
      data: bootcamp,
    });
  }
});

// @desc    Create a new bootcamp
// @route   POST /api/v1/bootcamps
// @access  Private
exports.createBootcamp = asyncHandler(async (req, res, next) => {
  // Add user to req.body
  req.body.user = req.user.id;

  // Check for published bootcamp
  const publishedBootcamp = await Bootcamp.findOne({ user: req.user.id });

  // If the user is not an admin, they can only add one bootcamp
  if (publishedBootcamp && req.user.role !== 'admin') {
    return next(
      new ErrorResponse(
        `This user with ID of ${req.user.id} has already published a bootcamp`
      )
    );
  }

  const bootcamp = await Bootcamp.create(req.body);

  res.status(201).json({
    success: true,
    data: bootcamp,
  });
});

// @desc    Update bootcamp
// @route   PUT /api/v1/bootcamp/:id
// @access  Private
exports.updateBootcamp = asyncHandler(async (req, res, next) => {
  const bootcamp = await Bootcamp.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  if (!bootcamp) {
    next(
      new ErrorResponse(`Bootcamp not found with id of ${req.params.id}`, 404)
    );
  } else {
    res.status(200).json({
      success: true,
      data: bootcamp,
    });
  }
});

// @desc    Delete bootcamp
// @route   DELETE /api/v1/bootcamp/:id
// @access  Private
exports.deleteBootcamp = async (req, res, next) => {
  try {
    const bootcamp = await Bootcamp.findById(req.params.id);

    if (!bootcamp) {
      next(
        new ErrorResponse(`Bootcamp not found with id of ${req.params.id}`, 404)
      );
    } else {
      bootcamp.remove();
      res.status(200).json({
        success: true,
        data: {},
      });
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Get bootcamps within a radius
// @route   GET /api/v1/bootcamps/radius/:zipcode/:distance
// @access  Private
exports.getBootcampsInRadius = async (req, res, next) => {
  const { zipcode, distance } = req.params;

  // Get lat/lng from geocoder
  const loc = await geocoder.geocode(zipcode);
  const lat = loc[0].latitude;
  const lng = loc[0].longitude;

  // Calculate radius using radians
  // Divide distance by radius of earth
  // Earth Radius = 3,963 mi = 6,371 km
  const radius = distance / 3963;

  const bootcamps = await Bootcamp.find({
    location: { $geoWithin: { $centerSphere: [[lng, lat], radius] } },
  });

  res.status(200).json({
    success: true,
    count: bootcamps.length,
    data: bootcamps,
  });
};

// @desc    Upload photo for bootcamp
// @route   PUT /api/v1/bootcamp/:id/photo
// @access  Private
exports.bootcampPhotoUpload = async (req, res, next) => {
  try {
    const bootcamp = await Bootcamp.findById(req.params.id);

    if (!bootcamp) {
      next(
        new ErrorResponse(`Bootcamp not found with id of ${req.params.id}`, 404)
      );
    } else {
      if (!req.files) {
        next(new ErrorResponse(`Please upload a file`, 400));
      } else {
        const file = req.files.file;

        // Make sure the image is a photo
        if (!file.mimetype.startsWith('image')) {
          return next(new ErrorResponse(`Please upload an image file`, 400));
        }

        // Check file size doesn't exceed max value
        if (file.size > process.env.MAX_FILE_UPLOAD) {
          return next(
            new ErrorResponse(
              `Please upload an image less than ${process.env.MAX_FILE_UPLOAD}`,
              400
            )
          );
        }

        // Create custome filename
        file.name = `photo_${bootcamp._id}${path.parse(file.name).ext}`;

        file.mv(`${process.env.FILE_UPLOAD_PATH}/${file.name}`, async (err) => {
          if (err) {
            console.log(err);
            return next(new ErrorResponse(`Problem with file upload`, 500));
          }

          await Bootcamp.findByIdAndUpdate(req.params.id, { photo: file.name });
          res.status(200).json({
            succes: true,
            data: file.name,
          });
        });
      }
    }
  } catch (error) {
    next(error);
  }
};

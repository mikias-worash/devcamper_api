const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middleware/async');
const Review = require('../models/Review');
const Bootcamp = require('../models/Bootcamp');

// @desc    Get reviews
// @route   GET /api/v1/revies
// @route   GET /api/v1/bootcamps/:bootcampId/reviews
// @access  Public
exports.getReviews = asyncHandler(async (req, res, next) => {
  if (req.params.bootcampId) {
    const reviews = await Review.find({ bootcamp: req.params.bootcampId });

    return res.status(200).json({
      success: true,
      count: reviews.length,
      data: reviews,
    });
  } else {
    res.status(200).json(res.advancedResults);
  }
});

// @desc    Get single reviews
// @route   GET /api/v1/reviews/:id
// @access  Public
exports.getReview = asyncHandler(async (req, res, next) => {
  const review = await (
    await Review.findById(req.params.id)
  ).populate({
    path: 'bootcamp',
    select: 'name description',
  });

  if (!review) {
    next(
      new ErrorResponse(`Review not found with id of ${req.params.id}`, 404)
    );
  } else {
    res.status(200).json({
      success: true,
      data: review,
    });
  }
});

// @desc    Add Review
// @route   POST /api/v1/bootcamps/:bootcampId/reviews
// @access  Private
exports.addReview = asyncHandler(async (req, res, next) => {
  req.body.bootcamp = req.params.bootcampId;
  req.body.user = req.user.id;

  const bootcamp = await Bootcamp.findById(req.params.bootcampId);

  if (!bootcamp) {
    next(
      new ErrorResponse(`Bootcamp not found with id of ${req.params.id}`, 404)
    );
  } else {
    const review = await Review.create(req.body);

    res.status(200).json({
      success: true,
      data: review,
    });
  }
});

// @desc    Update review
// @route   PUT /api/v1/reviews/:id
// @access  Private
exports.updateReview = asyncHandler(async (req, res, next) => {
  let review = await Review.findById(req.params.id);

  if (!review) {
    next(
      new ErrorResponse(`Review not found with id of ${req.params.id}`, 404)
    );
  } else {
    // Make sure user is review owner
    if (review.user.toString() !== req.user.id && req.user.role !== 'admin') {
      return next(
        new ErrorResponse(
          `user ${req.user.id} is not authorized to update this review ${review._id}`,
          401
        )
      );
    }

    review = await Review.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({
      success: true,
      data: review,
    });
  }
});

// @desc    Delete review
// @route   Delete /api/v1/reviews/:id
// @access  Private
exports.deleteReview = asyncHandler(async (req, res, next) => {
  const review = await Review.findById(req.params.id);

  if (!review) {
    next(
      new ErrorResponse(`Review not found with id of ${req.params.id}`, 404)
    );
  } else {
    // Make sure user is review owner
    if (review.user.toString() !== req.user.id && req.user.role !== 'admin') {
      return next(
        new ErrorResponse(
          `user ${req.user.id} is not authorized to delete this review ${review._id}`,
          401
        )
      );
    }

    await review.remove();

    res.status(200).json({
      success: true,
      data: {},
    });
  }
});

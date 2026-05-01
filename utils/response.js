//success response
const successResponse = (res, message = "Success", data = {}) => {
    return res.status(200).json({
        success: true,
        message,
        data
    })
};

//created response
const createdResponse = (res, message = "Created successfully", data = {}) => {
    return res.status(201).json({
        success: true,
        message,
        data
    })
};

//updated response
const updatedResponse = (res, message = "Updated succesfully", data = {}) => {
    return res.status(200).json({
        success: true,
        message,
        data
    })
};

//delete response

const deleteResponse = (res, message = "Deleted Succesfully") => {
    return res.status(200).json({
        success: true,
        message
    })
};

//all fields required
const allFieldsResponse = (res, message = "All fields are required", data = {}) => {
    return res.status(400).json({
        success: false,
        message
    })
};

//Not Found 

const notFound_Response = (res, message = "Resource not Found") => {
    return res.status(404).json({
        success: false,
        message
    })
};


//Not Found 

const alreadyExist_Response = (res, message = "Data allready exist") => {
    return res.status(409).json({
        success: false,
        message
    })
};

//server error
const serverError_Response = (res, error) => {
    console.error(error);
    return res.status(500).json({
        success: false,
        message: "Internal Server Error"
    })
};
//send response for opt verification
const otpVerificationResponse = (res, message = "OTP verified successfully", success = true) => {
  return res.status(200).json({
    success,
    message
  });
}


module.exports = {
    serverError_Response,
    alreadyExist_Response,
    notFound_Response,
    allFieldsResponse,
    deleteResponse,
    updatedResponse,
    createdResponse,
    successResponse,
    otpVerificationResponse
}
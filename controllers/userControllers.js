const env = require("dotenv");
env.config({ path: "./.env" });
const { catchAsyncErron } = require("../middlewares/catchAsyncError");
const errorHandler = require("../utils/errorHandler");
const sendmail = require("../utils/sendmail");
const activationToken = require("../utils/activationToken");
const jwt = require("jsonwebtoken");
const { v4: uuidv4 } = require("uuid");
const Student = require("../models/studentModel");
const School = require("../models/schoolModel");
const User = require("../models/userModel");
const school = require("../models/schoolModel");
const student = require("../models/studentModel");
const generateTokens = require("../utils/generateTokens");
const moment = require("moment");
// const generateTokens = require("../utils/generateTokens");
// // const cloudinary = require("cloudinary").v2;

// exports.homepage = catchAsyncErron((req, res, next) => {});

const cloudinary = require("cloudinary");

cloudinary.v2.config({
  cloud_name: "dcj2gzytt",
  api_key: process.env.CLOUDINARY_PUBLIC_KEY,
  api_secret: process.env.CLOUDINARY_SECRET_KEY,
});

const xlsx = require("xlsx");
const fs = require("fs");
const getDataUri = require("../middlewares/daraUri");

exports.userRegistration = catchAsyncErron(async (req, res, next) => {
  const { name, email, password, contact, city, district, state, companyName } =
    req.body;
  console.log(req.body);

  if (
    !name ||
    !email ||
    !password ||
    !contact ||
    !city ||
    !district ||
    !state ||
    !companyName
  )
    return next(new errorHandler(`fill all deatils`));

  const isEmailExit = await User.findOne({ email: email });
  if (isEmailExit)
    return next(new errorHandler("User With This Email Address Already Exits"));

  const ActivationCode = Math.floor(1000 + Math.random() * 9000);
  console.log(ActivationCode)

  const user = {
    name,
    email,
    contact,
    password,
    city,
    district,
    state,
    companyName,
  };

  const data = { name: name, activationCode: ActivationCode };

  try {
    await sendmail(
      res,
      next,
      email,
      "Verification code",
      "activationMail.ejs",
      data
    );
    console.log("extracted");
    let token = await activationToken(user, ActivationCode);
    let options = {
      httpOnly: true,
      secure: true,
    };
    res.status(200).cookie("token", token, options).json({
      succcess: true,
      message: "successfully send mail pleas check your Mail",
    });
  } catch (error) {
    return next(new errorHandler(error.message, 400));
  }
});

exports.userActivation = catchAsyncErron(async (req, res, next) => {
  let { activationCode } = req.body;

  if (!activationCode) return next(new errorHandler("Provide Activation Code"));

  const { token } = req.cookies;
  const { user, ActivationCode } = await jwt.verify(
    token,
    process.env.ACCESS_TOKEN_SECRET
  );

  const isEmailExit = await User.findOne({ email: user.email });
  if (isEmailExit)
    return next(new errorHandler("User With This Email Address Already Exits"));

  if (activationCode != ActivationCode)
    return next(new errorHandler("Wrong Activation Code"));

  let { name, email, password, contact, city, district, state, companyName } =
    user;

  const newUser = await User.create({
    name,
    email,
    password,
    contact,
    city,
    district,
    state,
    companyName,
    isVerified: true,
  });
  await newUser.save();

  const { accesToken } = generateTokens(user);

  await user.save();
  user.password = "";

  const options = {
    httpOnly: true,
    secure: true,
    maxAge: 30 * 24 * 60 * 60 * 1000,
  };

  res.status(201).cookie("Token", accesToken, options).json({
    succcess: true,
    message: "successfully register",
    user: user,
    token: accesToken,
  });
});

exports.userLogin = catchAsyncErron(async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password)
    return next(new errorHandler("Pleas fill all details"));

  const user = await User.findOne({ email: email }).select("+password").exec();
  if (!user) return next(new errorHandler("User Not Found", 404));

  const isMatch = await user.comparePassword(password);
  if (!isMatch) return next(new errorHandler("Wrong Credientials", 500));

  const { accesToken } = generateTokens(user);

  await user.save();
  user.password = "";

  const options = {
    httpOnly: true,
    secure: true,
    maxAge: 30 * 24 * 60 * 60 * 1000,
  };

  res.status(200).cookie("Token", accesToken, options).json({
    succcess: true,
    message: "successfully login",
    user: user,
    token: accesToken,
  });
});

exports.EditUser = catchAsyncErron(async (req, res, next) => {
  const id = req.id;

  const updates = req.body;

  // Find the user by ID and update their details
  const user = await User.findByIdAndUpdate(id, updates, { new: true });

  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  // Respond with the updated user details
  res.status(200).json(user);
});

exports.updatePassword = catchAsyncErron(async (req, res, next) => {
  const id = req.id;
  const { currentPassword, newPassword } = req.body;

  const user = await User.findById(id).select("+password");

  user.password = newPassword;

  await user.save();

  // Respond with the updated user details
  res.status(200).json(user);
});

exports.userLongOut = catchAsyncErron(async (req, res, next) => {
  const options = {
    httpOnly: true,
    secure: true,
  };
  res.clearCookie("Token", options).json({
    succcess: true,
    message: "successfully logout",
  });
});

// exports.refresh = catchAsyncErron(async (req, res, next) => {
//   const token =
//     req.cookies?.refreshToken ||
//     req.header("Authorization")?.replace("Bearer ", "");

//   if (!token) {
//     return next(new errorHandler("Unauthorized request", 401));
//   }

//   // check user in cache
//   const session = await redis.get(decoded._id);
//   if (!session) {
//     return next(new errorHandler("Could Not Refresh Token", 400));
//   }

//   const user = JSON.parse(session);
// });

// exports.addSchool = catchAsyncErron(async (req, res, next) => {
//   const id = req.id;
//   const schoolName = req.body.schoolName;

//   res.status(200)
//     .json({
//       succcess: true,
//       message: "successfully Added Name",
//       user: user
//     });
// });

exports.userAvatar = catchAsyncErron(async (req, res, next) => {
  const file = req.file;

    if (!file) {
      return res.status(400).send("No file uploaded.");
    }
    const files = req.file.path;
    console.log(files)
});

exports.addSchool = catchAsyncErron(async (req, res, next) => {
  const id = req.id;
  const file = req.file;


  const user = await User.findById(id);

  const { name, email, contact, password } = req.body;

  if (!name) return next(new errorHandler("School name is Required"));

  if (!email) return next(new errorHandler("Email is Required"));

  if (!contact) return next(new errorHandler("Contact is Required"));

  if (!password) return next(new errorHandler("Password is Required"));

  const currSchool = await School.create(req.body);
  console.log(currSchool)

  user.schools.push(currSchool._id);
  user.save();
  currSchool.user = user._id;
  if (file) {
    const fileUri = getDataUri(file)

    const myavatar = await cloudinary.v2.uploader.upload(fileUri.content);

    console.log(myavatar)

    currSchool.logo = {
      publicId: myavatar.public_id,
      url: myavatar.url,
    };
  }
  currSchool.save();

  res.status(200).json({
    succcess: true, 
    message: "successfully Register",
    user: user,
    school: currSchool,
  });
});

exports.editSchool = catchAsyncErron(async (req, res, next) => {
  const schoolId = req.params.id;
  const updatedSchool = await School.findByIdAndUpdate(schoolId, req.body, {
    new: true,
  });

  const file = req.file;

  if (file) {
    const currentSchool = await School.findById(schoolId);

    if (currentSchool.logo.publicId !== "") {
      await cloudinary.v2.uploader.destroy(
        currentSchool.logo.publicId,
        (error, result) => {
          if (error) {
            console.error("Error deleting file from Cloudinary:", error);
          } else {
            console.log("File deleted successfully:", result);
          }
        }
      );
    }


    const fileUri = getDataUri(file)
    const myavatar = await cloudinary.v2.uploader.upload(fileUri.content);


    currentSchool.logo = {
      publicId: myavatar.public_id,
      url: myavatar.url,
    };
    currentSchool.save();

    res.status(200).json({
      success: true,
      message: "School updated successfully",
      school: currentSchool,
    });
  }

  // Check if the school was found and updated successfully

  res.status(200).json({
    success: true,
    message: "School updated successfully",
    school: updatedSchool,
  });
});



exports.deleteSchool = catchAsyncErron(async (req, res, next) => {
  const schoolId = req.params.id; // The ID of the school to delete

  // Attempt to find and delete the school by its ID
  const school = await School.findById(schoolId);

  if (!school) {
    return res.status(404).json({ message: "School not found" });
  }

  // Delete all associated students
  await Student.deleteMany({ school: schoolId });

  // Delete the school itself
  await School.findByIdAndDelete(schoolId);

  // If the school was successfully deleted, return a success response
  res.status(200).json({
    success: true,
    message: "School deleted successfully",
    school: school,
  });
});



exports.ChangeActive = catchAsyncErron(async (req, res, next) => {
  const schoolId = req.params.id; // The ID of the school to delete

  // Attempt to find and delete the school by its ID
  const currSchool = await School.findById(schoolId);

  // If no school was found with the given ID, return an error
  if (!currSchool) {
    return next(
      new errorHandler(`School not found with id of ${schoolId}`, 404)
    );
  }

  currSchool.isActive = !currSchool.isActive;

  currSchool.save();
  // If the school was successfully deleted, return a success response
  res.status(200).json({
    success: true,
    message: "School deleted successfully",
    school: currSchool,
  });
});

exports.addStudent = catchAsyncErron(async (req, res, next) => {
  const id = req.id;
  const file = req.file;

  const user = await User.findById(id);

  const schoolID = req.params.id;
  const currSchool = await School.findById(schoolID);

  if (!currSchool) return next(new errorHandler("invalidate School ID"));

  const { name, fatherName } = req.body;

  console.log(req.body);
  if (!name) return next(new errorHandler("name is Required"));

  if (!fatherName) return next(new errorHandler("fathername is Required"));

  let currStudent = {
    name,
  };

  if (req.body.fatherName) {
    currStudent.fatherName = req.body.fatherName;
  }

  if (req.body.motherName) {
    currStudent.motherName = req.body.motherName;
  }
  if (req.body.gender) {
    currStudent.gender = req.body.gender;
  }
  if (req.body.dob) {
    currStudent.dob = req.body.dob;
  }
  if (req.body.contact) {
    currStudent.contact = req.body.contact;
  }
  if (req.body.email) {
    currStudent.email = req.body.email;
  }
  if (req.body.address) {
    currStudent.address = req.body.address;
  }
  if (req.body.rollNo) {
    currStudent.rollNo = req.body.rollNo;
  }
  if (req.body.class) {
    currStudent.class = req.body.class;
  }
  if (req.body.section) {
    currStudent.section = req.body.section;
  }
  if (req.body.session) {
    currStudent.session = req.body.session;
  }
  if (req.body.admissionNo) {
    currStudent.admissionNo = req.body.admissionNo;
  }
  if (req.body.busNo) {
    currStudent.busNo = req.body.busNo;
  }
  if (req.body.bloodGroup) {
    currStudent.bloodGroup = req.body.bloodGroup;
  }
  if (req.body.studentID) {
    currStudent.studentID = req.body.studentID;
  }
  if (req.body.aadharNo) {
    currStudent.aadharNo = req.body.aadharNo;
  }
  if (req.body.ribbionColour) {
    currStudent.ribbionColour = req.body.ribbionColour;
  }
  if (req.body.routeNo) {
    currStudent.routeNo = req.body.routeNo;
  }
  if (req.body.aadharNo) {
    currStudent.aadharNo = req.body.aadharNo;
  }

  const student = await Student.create(currStudent);
  // if(req.body.avatar){

  // }

  student.school = currSchool._id;
  student.user = id;

  if (file) {
    const fileUri = getDataUri(file)

    const myavatar = await cloudinary.v2.uploader.upload(fileUri.content);

    console.log(myavatar)

    student.avatar = {
      publicId: myavatar.public_id,
      url: myavatar.url,
    };
  }
  student.save();

  res.status(200).json({
    succcess: true,
    message: "successfully Register",
    user: user,
    student: student,
  });
});

exports.editStudent = catchAsyncErron(async (req, res, next) => {
  const studentId = req.params.id;
  console.log(studentId);
  const updates = req.body; // The updates from the request body.

  const updatedStudent = await Student.findByIdAndUpdate(studentId, updates, {
    new: true,
  });



  const file = req.file;

  if (file) {
    const currStudent = await Student.findById(studentId);
    if (currStudent.avatar.publicId !== "") {
      await cloudinary.v2.uploader.destroy(
        currStudent.avatar.publicId,
        (error, result) => {
          if (error) {
            console.error("Error deleting file from Cloudinary:", error);
          } else {
            console.log("File deleted successfully:", result);
          }
        }
      );
    }


    const fileUri = getDataUri(file)
    const myavatar = await cloudinary.v2.uploader.upload(fileUri.content);


    currStudent.avatar = {
      publicId: myavatar.public_id,
      url: myavatar.url,
    };
    currStudent.save();

    res.status(200).json({
      success: true,
      message: "Student updated successfully",
      student: currStudent,
    });
  }


  // Respond with the updated student information.
  res.status(200).json({
    success: true,
    message: "Student updated successfully",
    student: updatedStudent,
  });
});


exports.changeStudentAvatar = catchAsyncErron(async (req, res, next) => {
  const id = req.id;
  const studentId = req.params.id
  const student = await Student.findById(studentId);
  if (student.avatar.publicId !== "") {
    await cloudinary.uploader.destroy(
      student.avatar.publicId,
      (error, result) => {
        if (error) {
          console.error("Error deleting file from Cloudinary:", error);
        } else {
          console.log("File deleted successfully:", result);
        }
      }
    );
  }
  const studentAvatar = await cloudinary.uploader.upload(filepath.tempFilePath, {
    folder: "school",
  });
  
  student.logo = {
    fileId: studentAvatar.public_id,
    url: studentAvatar.secure_url,
  };

  await student.save()

  res.status(200).json({
    success: true,
    message: "Student Avatar Update successfully",
    school: student,
  });


});

exports.deleteStudent = catchAsyncErron(async (req, res, next) => {
  const studentId = req.params.id; // Assuming the student ID is in the URL.

  // Attempt to find the student by ID and delete it.
  const deletedStudent = await Student.findByIdAndDelete(studentId);

  if (!deletedStudent) {
    // If no student was found with the given ID, return an error response.
    return next(
      new errorHandler(`Student not found with id of ${studentId}`, 404)
    );
  }

  // Respond with a success message indicating the student was deleted.
  res.status(200).json({
    success: true,
    message: "Student deleted successfully",
  });
});

// Assuming you have required necessary modules and defined Student model

exports.getAllStudentsInSchool = catchAsyncErron(async (req, res, next) => {
  const schoolId = req.params.id; // School ID from request params
  const status = req.query.status; // State from query parameters

  let queryObj = { school: schoolId };
  if (status) {
    queryObj.status = status; // Assuming your student schema has a 'state' field
  }

  // Find all students in the given school using the school ID
  const students = await Student.find(queryObj);

  if (!students || students.length === 0) {
    // If no students are found for the given school, return an appropriate response
    return res.status(404).json({
      success: false,
      message: "No students found for the provided school ID",
    });
  }

  // Respond with the list of students found in the school
  res.status(200).json({
    success: true,
    message: "Students found for the provided school ID",
    students: students,
  });
});

// ---------------------StatusReaduToPrint----------------

exports.updateStudentStatusToPrint = catchAsyncErron(async (req, res, next) => {
  const schoolID = req.params.id;
  let { studentIds } = req.body; // Assuming both are passed in the request body

  if (typeof studentIds === "string") {
    try {
      studentIds = JSON.parse(`[${studentIds}]`);
    } catch (error) {
      // If JSON.parse fails, split the string by commas and manually remove quotes
      studentIds = studentIds
        .split(",")
        .map((id) => id.trim().replace(/^"|"$/g, ""));
    }
  }

  // Validate inputs (schoolId and studentIds)
  if (!schoolID || !studentIds) {
    return res.status(400).json({
      success: false,
      message:
        "Invalid request. Please provide a school ID and a list of student IDs.",
    });
  }

  // Update status of students
  const updated = await Student.updateMany(
    {
      _id: { $in: studentIds }, // Filter documents by student IDs
      school: schoolID, // Ensure the students belong to the specified school
    },
    {
      $set: { status: "Ready to print" }, // Set the status to "Ready to print"
    }
  );

  // If no documents were updated, it could mean invalid IDs were provided or they don't match the school ID
  if (updated.matchedCount === 0) {
    return res.status(404).json({
      success: false,
      message: "No matching students found for the provided IDs and school ID.",
    });
  }

  res.status(200).json({
    success: true,
    message: `${updated.modifiedCount} students' status updated to "Ready to print"`,
  });
});

// ---------------------StatusPending------------

exports.updateStudentStatusToPending = catchAsyncErron(
  async (req, res, next) => {
    const schoolID = req.params.id;
    let { studentIds } = req.body; // Assuming both are passed in the request body

    if (typeof studentIds === "string") {
      try {
        studentIds = JSON.parse(`[${studentIds}]`);
      } catch (error) {
        // If JSON.parse fails, split the string by commas and manually remove quotes
        studentIds = studentIds
          .split(",")
          .map((id) => id.trim().replace(/^"|"$/g, ""));
      }
    }

    // Validate inputs (schoolId and studentIds)
    if (!schoolID || !studentIds) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid request. Please provide a school ID and a list of student IDs.",
      });
    }

    // Update status of students
    const updated = await Student.updateMany(
      {
        _id: { $in: studentIds }, // Filter documents by student IDs
        school: schoolID, // Ensure the students belong to the specified school
      },
      {
        $set: { status: "Panding" }, // Set the status to "Ready to print"
      }
    );

    // If no documents were updated, it could mean invalid IDs were provided or they don't match the school ID
    if (updated.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        message:
          "No matching students found for the provided IDs and school ID.",
      });
    }

    res.status(200).json({
      success: true,
      message: `${updated.modifiedCount} students' status updated to "Panding"`,
    });
  }
);

// ---------------------StatusPrint------------

// exports.deleteManyStudents = catchAsyncErron(async (req, res, next) => {
//   const schoolID = req.params.id
//   let {studentIds } = req.body; // Assuming both are passed in the request body

//   if (typeof studentIds === 'string') {
//     try {
//       studentIds = JSON.parse(`[${studentIds}]`);
//     } catch (error) {
//       // If JSON.parse fails, split the string by commas and manually remove quotes
//       studentIds = studentIds.split(',').map(id => id.trim().replace(/^"|"$/g, ''));
//     }
//   }

//   // Validate inputs (schoolId and studentIds)
//   if (!schoolID || !studentIds ) {
//     return res.status(400).json({
//       success: false,
//       message: "Invalid request. Please provide a school ID and a list of student IDs."
//     });
//   }

//   // Update status of students
//   const updated = await Student.updateMany(
//     {
//       _id: { $in: studentIds }, // Filter documents by student IDs
//       school: schoolID // Ensure the students belong to the specified school
//     },
//     {
//       $set: { status: "Printed" } // Set the status to "Ready to print"
//     }
//   );

//   // If no documents were updated, it could mean invalid IDs were provided or they don't match the school ID
//   if (updated.matchedCount === 0) {
//     return res.status(404).json({
//       success: false,
//       message: "No matching students found for the provided IDs and school ID."
//     });
//   }

//   res.status(200).json({
//     success: true,
//     message: `${updated.modifiedCount} students' status updated to "Printed"`,
//   });
// });

exports.updateStudentStatusToPrinted = catchAsyncErron(
  async (req, res, next) => {
    const schoolID = req.params.id;
    let { studentIds } = req.body; // Assuming both are passed in the request body

    if (typeof studentIds === "string") {
      try {
        studentIds = JSON.parse(`[${studentIds}]`);
      } catch (error) {
        // If JSON.parse fails, split the string by commas and manually remove quotes
        studentIds = studentIds
          .split(",")
          .map((id) => id.trim().replace(/^"|"$/g, ""));
      }
    }

    // Validate inputs (schoolId and studentIds)
    if (!schoolID || !studentIds) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid request. Please provide a school ID and a list of student IDs.",
      });
    }

    // Update status of students
    const updated = await Student.updateMany(
      {
        _id: { $in: studentIds }, // Filter documents by student IDs
        school: schoolID, // Ensure the students belong to the specified school
      },
      {
        $set: { status: "Printed" }, // Set the status to "Ready to print"
      }
    );

    // If no documents were updated, it could mean invalid IDs were provided or they don't match the school ID
    if (updated.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        message:
          "No matching students found for the provided IDs and school ID.",
      });
    }

    res.status(200).json({
      success: true,
      message: `${updated.modifiedCount} students' status updated to "Printed"`,
    });
  }
);

exports.deleteStudents = catchAsyncErron(async (req, res, next) => {
  const schoolID = req.params.id;
  let { studentIds } = req.body;

  // Check if studentIds is a string; if so, try to convert it to an array
  if (typeof studentIds === "string") {
    try {
      studentIds = JSON.parse(`[${studentIds}]`);
    } catch (error) {
      studentIds = studentIds
        .split(",")
        .map((id) => id.trim().replace(/^"|"$/g, ""));
    }
  }

  // Validate inputs
  if (!schoolID || !Array.isArray(studentIds) || studentIds.length === 0) {
    return res.status(400).json({
      success: false,
      message:
        "Invalid request. Please provide a school ID and a list of student IDs.",
    });
  }

  // Delete students
  const deletionResult = await Student.deleteMany({
    _id: { $in: studentIds },
    school: schoolID,
  });

  // Check if the deletion was successful
  if (deletionResult.deletedCount === 0) {
    return res.status(404).json({
      success: false,
      message: "No matching students found for the provided IDs and school ID.",
    });
  }

  res.status(200).json({
    success: true,
    message: `${deletionResult.deletedCount} students deleted successfully.`,
  });
});

// exports.studentListExcel = catchAsyncErron(async (req, res, next) => {
//   const schoolID = req.params.id;

//   try {
//       // Find all students belonging to the specified school
//       const students = await Student.find({ school: schoolID });

//       if (students.length === 0) {
//           return res.status(404).send("No students found for the provided school ID.");
//       }

//       // Format student data into an array of arrays (rows)
//       const rows = students.map(student => [
//           student.name,
//           student.fatherName,
//           student.motherName,
//           student.class,
//           student.section,
//           student.contact,
//           student.address,
//           // Add other fields as needed
//       ]);

//       // Add headers for each column
//       const headers = [
//           "Student Name",
//           "Father's Name",
//           "Mother's Name",
//           "Class",
//           "Section",
//           "Contact",
//           "Address",
//           // Add other headers as needed
//       ];

//       // Insert headers as the first row
//       rows.unshift(headers);

//       // Create a new workbook
//       const wb = xlsx.utils.book_new();

//       // Add a worksheet to the workbook
//       const ws = xlsx.utils.aoa_to_sheet(rows);

//       // Add the worksheet to the workbook
//       xlsx.utils.book_append_sheet(wb, ws, "Students");

//       // Write the workbook to a file
//       const fileName = `students_${schoolID}.xlsx`;
//       const filePath = `./${fileName}`;
//       xlsx.writeFile(wb, filePath);
//       console.log(fileName)
//       console.log(filePath)

//       // Send the file to the user as an attachment
//       res.download(filePath, fileName, () => {
//           // After the file is sent, delete it from the server
//           fs.unlinkSync(filePath);
//       });

//   } catch (err) {
//       console.error("Error downloading students:", err);
//       return res.status(500).send("Error downloading students.");
//   }
// });

exports.studentListExcel = catchAsyncErron(async (req, res, next) => {
  const schoolID = req.params.id;

  try {
    // Find all students belonging to the specified school
    const students = await Student.find({ school: schoolID });

    if (students.length === 0) {
      return res
        .status(404)
        .send("No students found for the provided school ID.");
    }

    // Format student data into an array of arrays (rows)
    const rows = students.map((student) => [
      student.name,
      student.fatherName,
      student.motherName,
      student.class,
      student.section,
      student.contact,
      student.address,
      // Add other fields as needed
    ]);

    // Add headers for each column
    const headers = [
      "Student Name",
      "Father's Name",
      "Mother's Name",
      "Class",
      "Section",
      "Contact",
      "Address",
      // Add other headers as needed
    ];

    // Insert headers as the first row
    rows.unshift(headers);

    // Create a new workbook
    const wb = xlsx.utils.book_new();

    // Add a worksheet to the workbook
    const ws = xlsx.utils.aoa_to_sheet(rows);

    // Add the worksheet to the workbook
    xlsx.utils.book_append_sheet(wb, ws, "Students");

    // Write the workbook to a buffer
    const buffer = xlsx.write(wb, { type: "buffer", bookType: "xlsx" });
    buffer;

    // Set response headers to indicate that you're sending an Excel file
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=students_${schoolID}.xlsx`
    );

    // Send the Excel file data in the response body
    res.send(buffer);
  } catch (err) {
    console.error("Error downloading students:", err);
    return res.status(500).send("Error downloading students.");
  }
});

exports.SerchSchool = catchAsyncErron(async (req, res, next) => {
  try {
    const id = req.id;
    const searchQuery = req.query.q; // Get search query from URL query parameters
    console.log(searchQuery)

    const jobs = await searchSchool(searchQuery, id);
    res.json(jobs);
  } catch (error) {
    console.error("Error in SearchJobs route:", error);
    res.status(500).json({ success: false, error: "Internal Server Error" });
  }

  async function searchSchool(query, location) {
    const searchRegex = new RegExp(query, "i"); // 'i' for case-insensitive
    console.log("call")
    const queryObj = {
      name: { $regex: searchRegex },
      user: req.id,
    };

    return School.find(queryObj);
  }
});

exports.GraphData = catchAsyncErron(async (req, res, next) => {
  let { year, month } = req.query;

  // If year and month are not provided, default to the current month and year
  if (!year || !month) {
    const currentDate = moment(); // Get the current date
    year = currentDate.format("YYYY"); // Extract current year
    month = currentDate.format("MM"); // Extract current month
  }

  // Parse the year and month provided by the user
  const selectedDate = moment(`${year}-${month}`, "YYYY-MM");

  // Determine the start and end dates for the specified month and year
  const startDate = selectedDate.startOf("month");
  const endDate = selectedDate.endOf("month");

  // Calculate the start date of four weeks ago
  const fourWeeksAgo = moment(startDate).subtract(4, "weeks");

  try {
    // Query the database to find schools registered within the last four weeks of the specified month and year
    const registeredSchools = await School.find({
      createdAt: {
        $gte: fourWeeksAgo.toDate(), // Convert moment object to Date
        $lte: endDate.toDate(), // Convert moment object to Date
      },
    });

    const registeredStudents = await Student.find({
      createdAt: {
        $gte: fourWeeksAgo.toDate(), // Convert moment object to Date
        $lte: endDate.toDate(), // Convert moment object to Date
      },
    });

    // Initialize an array to store the counts of registered schools for each week
    const weeklyCounts = [];
    const weeklyCountsStrudent = [];

    // Calculate the number of schools registered in each week
    for (let i = 0; i < 4; i++) {
      const startDateOfWeek = moment(fourWeeksAgo).add(i, "weeks");
      const endDateOfWeek = moment(startDateOfWeek).endOf("week");
      const count = registeredSchools.filter(
        (school) =>
          moment(school.createdAt).isBetween(
            startDateOfWeek,
            endDateOfWeek,
            null,
            "[]"
          ) // Check if createdAt is within the week range
      ).length;
      weeklyCounts.push(count);
    }

    for (let i = 0; i < 4; i++) {
      const startDateOfWeek = moment(fourWeeksAgo).add(i, "weeks");
      const endDateOfWeek = moment(startDateOfWeek).endOf("week");
      const count = registeredStudents.filter(
        (student) =>
          moment(student.createdAt).isBetween(
            startDateOfWeek,
            endDateOfWeek,
            null,
            "[]"
          ) // Check if createdAt is within the week range
      ).length;
      weeklyCountsStrudent.push(count);
    }

    const schoolCount = await School.countDocuments({user:req.id}) 

    const studntCount = await Student.countDocuments({user:req.id}) 


    // Format the data for the bar chart
    const barChartData = {
      labels: ["Week 1", "Week 2", "Week 3", "Week 4"],
      school: weeklyCounts,
      student:weeklyCountsStrudent,
      schoolCount: schoolCount,
      studentCount: studntCount
    };

    // Send the formatted data as a response to the user
    res.json(barChartData);
  } catch (error) {
    console.error("Error fetching school registration data:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

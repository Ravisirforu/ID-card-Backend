const express = require("express");
const { ExcelUpload, 
    userRegistration, 
    userActivation, 
    userLogin, 
    addStudent, 
    addSchool, 
    deleteStudent,
    editStudent,
    deleteSchool,
    editSchool,
    getAllStudentsInSchool,
    updateStudentStatusToPrint,
    updateStudentStatusToPending,
    updateStudentStatusToPrinted,
    deleteStudents,
    studentListExcel,
    GraphData,
    EditUser,
    updatePassword,
    userAvatar,
    ChangeActive,
    SerchSchool} = require("../controllers/userControllers");
const isAuthenticated = require("../middlewares/auth");
const router = express.Router();

const multer = require("multer");


const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// const isAuthenticated = require("../middlewares/auth");

router.get("/",(req,res)=>{
    res.send("welcomeuser")
})

router.post("/registration",userRegistration);

router.post("/activate/user",userActivation);

router.post("/login",userLogin);

router.post("/edit", isAuthenticated, EditUser);

router.post("/avatar", isAuthenticated, userAvatar);

router.post("/updatepassword", isAuthenticated, updatePassword);

router.post("/isactive/school/:id", isAuthenticated, ChangeActive);

router.post("/registration/school",upload.single("avatar"), isAuthenticated ,addSchool);

router.post("/avatar",upload.single("avatar"), isAuthenticated ,userAvatar);

router.post("/edit/school/:id", isAuthenticated ,editSchool);

router.post("/delete/school/:id", isAuthenticated ,deleteSchool);

router.post("/students/:id", isAuthenticated ,getAllStudentsInSchool);

router.post("/registration/student/:id", isAuthenticated ,addStudent);

router.post("/edit/student/:id", isAuthenticated ,editStudent);

router.post("/delete/student/:id", isAuthenticated ,deleteStudent);

router.post("/school/search", isAuthenticated ,SerchSchool);

router.post("/student/change-status/readyto/:id", isAuthenticated ,updateStudentStatusToPrint);

router.post("/student/change-status/pending/:id", isAuthenticated ,updateStudentStatusToPending);

router.post("/student/change-status/printed/:id", isAuthenticated ,updateStudentStatusToPrinted);

router.post("/studentlist/excel/:id", isAuthenticated ,studentListExcel);

router.post("/bar-chart", isAuthenticated ,GraphData);

// router.post("/registration/student/:id", isAuthenticated ,addStudent);

// router.get("/logout",isAuthenticated, userLongOut);

// router.put("/user",isAuthenticated,updateUserInfo)
// router.post("/uplaad/excel",ExcelUpload)



module.exports = router;
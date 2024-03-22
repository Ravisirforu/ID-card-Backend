const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const userModel = mongoose.Schema(
	{
		name: {
			type: String,
			required: [true, 'Name is Required'],
			minLength: [3, 'Firstname should be atleast of 3 Character'],
		},
		email: {
			type: String,
			required: true,
			unique: [true, "Email already exists"],
			index: { unique: true, sparse: true },
			match: [
				/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
				'Please fill a valid email address',
			],
		},
		contact: {
			type: String,
			// required: [true, 'Contact is Required'],
			minLength: [10, 'Constact must not be exceed of 10 Numbers'],
			maxLength: [10, 'Constact must be atleast of 10 Numbers'],
		},
		city: {
			type: String,
			// required: [true, 'City is Required'],
		},		
		district: {
			type: String,
			// required: [true, 'District is Required'],
		},
		state: {
			type: String,
			// required: [true, 'District is Required'],
		},
		companyName: {
			type: String,
			// required: [true, 'District is Required'],
		},
		password: {
			type: String,
			select: false,
			required: [true, "password is required"],
			minLength: [6, 'Password should have atleast 6 Characters'],
			// match: [/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[^a-zA-Z0-9]).{8,1024}$/ , "Password must have this char"],
		},
		resetpasswordToken: {
			type: String,
			default: 0,
		},
		avatar: {
			type: Object,
			default: {
				publicId: '',
				url: 'https://plus.unsplash.com/premium_photo-1699534403319-978d740f9297?q=80&w=2940&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
			},
		},
		schools: [
			{ type: mongoose.Schema.Types.ObjectId, ref: 'school' }
		],
		isVerified: {
			type: Boolean,
			default: false
		}
	},
	{ timestamps: true }
);

userModel.pre("save",async function(next){
    if(!this.isModified('password')){
        next();
    }
    this.password = await bcrypt.hash(this.password,10)
    next();
})

userModel.methods.comparePassword = async function (password){
    let match = await bcrypt.compare(password, this.password);
    return match
}

userModel.methods.generateAccesToken = function(){
    return jwt.sign({
        _id:this._id,
    },
    process.env.ACCESS_TOKEN_SECRET,
    { expiresIn: process.env.ACCESS_TOKEN_EXPIRY});
}

const user = mongoose.model('user', userModel);
module.exports = user;

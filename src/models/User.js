import mongoose from 'mongoose';   

const userSchema = new mongoose.Schema({
    email:{
        type:String,
        required:true,
        unique:true
    },
    fullName:{
        type:String,
        required:true
    },
    password:{
        type:String,
        required:true
    },
    profilePic:{
        type:String,
        default:"https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_960_720.png"
    },
    friends: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    }]
},{
    timestamps:true
})

export default mongoose.model('User',userSchema);
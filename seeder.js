const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');

dotenv.config();

const createAdmin = async() => {
    try {
        await mongoose.connect(process.env.MONGO_URI);

        const adminExists = await User.findOne({ username: 'admin' });

        if (adminExists) {
            console.log('حساب الأدمن موجود بالفعل!');
            process.exit();
        }

        const admin = await User.create({
            name: 'مدير النظام',
            username: 'admin',
            password: 'adminpassword123',
            role: 'admin',
            department: 'Management',
        });

        console.log('تم إنشاء حساب الأدمن بنجاح:');
        console.log(`Username: ${admin.username}`);
        console.log(`Password: adminpassword123`);
        process.exit();
    } catch (error) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
    }
};

createAdmin();
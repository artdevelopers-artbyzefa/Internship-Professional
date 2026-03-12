import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const testSchema = new mongoose.Schema({
    myDate: Date
});
const TestModel = mongoose.model('TestTimeTest', testSchema);

async function run() {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected');

    const expiryNum = Date.now() + 24 * 60 * 60 * 1000;
    const doc = new TestModel({ myDate: expiryNum });
    await doc.save();
    console.log('Saved with Number:', expiryNum);

    const retrieved = await TestModel.findById(doc._id);
    console.log('Retrieved type:', typeof retrieved.myDate);
    console.log('Retrieved value:', retrieved.myDate);
    console.log('Retrieved getTime():', retrieved.myDate.getTime());
    console.log('retrieved.myDate < Date.now()?', retrieved.myDate < Date.now());

    await TestModel.deleteMany({});
    await mongoose.connection.close();
}

run();

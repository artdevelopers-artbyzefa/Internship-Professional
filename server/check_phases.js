const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const phaseSchema = new mongoose.Schema({
    key: String,
    label: String,
    order: Number,
    status: String
});

const Phase = mongoose.model('Phase', phaseSchema);

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/DIMS').then(async () => {
    const active = await Phase.findOne({ status: 'active' });
    console.log('ACTIVE_PHASE:', JSON.stringify(active, null, 2));

    const all = await Phase.find().sort({ order: 1 });
    console.log('ALL_PHASE_ORDERS:');
    all.forEach(p => {
        console.log(`${p.order}. ${p.key} (${p.label}) - ${p.status}`);
    });

    mongoose.connection.close();
});

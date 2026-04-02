import mongoose from 'mongoose';

const companyAliasSchema = new mongoose.Schema({
    company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
    alias: { type: String, required: true, unique: true, trim: true },
    normalized_key: { type: String, required: true, unique: true }
}, { timestamps: true });

const supervisorAliasSchema = new mongoose.Schema({
    supervisor: { type: mongoose.Schema.Types.ObjectId, ref: 'SiteSupervisor', required: true },
    alias: { type: String, required: true, unique: true, trim: true },
    normalized_key: { type: String, required: true, unique: true }
}, { timestamps: true });

export const CompanyAlias = mongoose.model('CompanyAlias', companyAliasSchema);
export const SupervisorAlias = mongoose.model('SupervisorAlias', supervisorAliasSchema);

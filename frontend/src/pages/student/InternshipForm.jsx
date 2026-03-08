import React, { useState } from 'react';
import Card from '../../components/ui/Card.jsx';
import StepWizard from '../../components/ui/StepWizard.jsx';
import { FormGroup, TextInput, SelectInput, TextareaInput } from '../../components/ui/FormInput.jsx';
import Alert from '../../components/ui/Alert.jsx';
import Button from '../../components/ui/Button.jsx';

export default function InternshipForm() {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    companyName:'', city:'', country:'', industry:'',
    jobTitle:'', startDate:'', duration:'8', stipend:'', mode:'On-site',
    supervisor:'', designation:'', email:'', phone:'', desc:'',
  });
  const upd = (k, v) => setForm({ ...form, [k]: v });

  return (
    <Card>
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="text-sm font-bold text-primary">Internship Application Form</div>
          <div className="text-xs text-gray-400 mt-1">Complete all steps to submit your internship request</div>
        </div>
      </div>

      <StepWizard steps={['Company Info','Role Details','Supervisor','Review']} current={step} />

      {step === 1 && (
        <div className="grid grid-cols-2 gap-4">
          {[['Company Name','companyName','fa-building'],['City','city','fa-map-pin'],['Country','country','fa-globe'],['Industry','industry','fa-industry']].map(([l,k,ic]) => (
            <FormGroup key={k} label={l}>
              <TextInput iconLeft={ic} placeholder={`Enter ${l.toLowerCase()}`}
                value={form[k]} onChange={e => upd(k, e.target.value)} />
            </FormGroup>
          ))}
        </div>
      )}

      {step === 2 && (
        <div className="grid grid-cols-2 gap-4">
          {[['Job Title / Role','jobTitle','fa-briefcase'],['Start Date','startDate','fa-calendar'],['Duration (Weeks)','duration','fa-clock'],['Monthly Stipend (PKR)','stipend','fa-money-bill']].map(([l,k,ic]) => (
            <FormGroup key={k} label={l}>
              <TextInput iconLeft={ic} placeholder={l}
                value={form[k]} onChange={e => upd(k, e.target.value)} />
            </FormGroup>
          ))}
          <div className="col-span-2">
            <FormGroup label="Internship Mode">
              <SelectInput iconLeft="fa-laptop-house" value={form.mode} onChange={e => upd('mode', e.target.value)}>
                <option>On-site</option><option>Remote</option><option>Hybrid</option>
              </SelectInput>
            </FormGroup>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="grid grid-cols-2 gap-4">
          {[['Site Supervisor Name','supervisor','fa-user-tie'],['Designation','designation','fa-id-badge'],['Contact Email','email','fa-envelope'],['Contact Phone','phone','fa-phone']].map(([l,k,ic]) => (
            <FormGroup key={k} label={l}>
              <TextInput iconLeft={ic} placeholder={l}
                value={form[k]} onChange={e => upd(k, e.target.value)} />
            </FormGroup>
          ))}
          <div className="col-span-2">
            <FormGroup label="Job Description">
              <TextareaInput placeholder="Brief description of your role..." rows={3}
                value={form.desc} onChange={e => upd('desc', e.target.value)} />
            </FormGroup>
          </div>
        </div>
      )}

      {step === 4 && (
        <div>
          <Alert type="info">Please review your information before submitting.</Alert>
          <div className="bg-lightbg border border-blue-200 rounded-xl p-4">
            {[['Company',form.companyName||'TechSoft Pvt Ltd'],['City',form.city||'Islamabad'],['Role',form.jobTitle||'Software Intern'],['Duration',`${form.duration||8} Weeks`],['Mode',form.mode],['Site Supervisor',form.supervisor||'Mr. Tariq Mehmood']].map(([l,v]) => (
              <div key={l} className="flex items-center gap-2 py-2 border-b border-gray-200 last:border-0">
                <span className="text-xs text-gray-400 font-medium min-w-36">{l}</span>
                <span className="text-sm text-gray-700 font-medium">{v}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mt-6">
        {step > 1
          ? <Button variant="outline" onClick={() => setStep(step - 1)}><i className="fas fa-arrow-left"></i> Back</Button>
          : <span />}
        {step < 4
          ? <Button variant="primary" onClick={() => setStep(step + 1)}>Next <i className="fas fa-arrow-right"></i></Button>
          : <Button variant="primary"><i className="fas fa-paper-plane"></i> Submit Application</Button>}
      </div>
    </Card>
  );
}

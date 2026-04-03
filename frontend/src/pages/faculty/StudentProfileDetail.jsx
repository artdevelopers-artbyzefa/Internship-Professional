import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Button from '../../components/ui/Button.jsx';
import Card from '../../components/ui/Card.jsx';
import StatusBadge from '../../components/ui/StatusBadge.jsx';
import { showToast } from '../../utils/notifications.jsx';
import { apiRequest } from '../../utils/api.js';

export default function StudentProfileDetail() {
  const { studentId } = useParams();
  const navigate = useNavigate();
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStudent = async () => {
      // Safety check: if studentId is not a valid MongoDB ObjectId (24 chars hex) 
      // or if it's a known non-ID route like "dashboard", redirect back.
      if (!studentId || studentId === 'dashboard' || studentId.length !== 24) {
        navigate('/faculty/dashboard');
        return;
      }

      try {
        const data = await apiRequest(`/faculty/student-profile/${studentId}`);
        setStudent(data);
      } catch (error) {
        // Error handled by apiRequest
      } finally {
        setLoading(false);
      }
    };
    fetchStudent();
  }, [studentId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <i className="fas fa-circle-notch fa-spin text-3xl text-primary"></i>
      </div>
    );
  }

  if (!student) {
    return (
        <div className="text-center p-12">
            <h2 className="text-2xl font-black text-gray-800 tracking-tight">Student not found</h2>
            <Button onClick={() => navigate('/faculty/students')} className="mt-4">Back to List</Button>
        </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between mb-4">
        <Button variant="outline" onClick={() => navigate('/faculty/students')}>
          <i className="fas fa-arrow-left mr-2"></i> Back to List
        </Button>
        <StatusBadge status={student.status} />
      </div>

      <Card className="overflow-hidden">
        <div className="bg-primary/5 p-8 border-b border-gray-100 flex flex-col md:flex-row items-center gap-8">
            <div className="w-32 h-32 rounded-2xl bg-white shadow-sm border-4 border-white overflow-hidden flex-shrink-0">
                {student.profilePicture ? (
                    <img src={student.profilePicture} alt={student.name} className="w-full h-full object-cover" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-50 text-gray-300">
                        <i className="fas fa-user text-5xl"></i>
                    </div>
                )}
            </div>
            <div className="text-center md:text-left">
                <h1 className="text-3xl font-black text-gray-800 tracking-tight">{student.name}</h1>
                <p className="text-primary font-bold">{student.reg}</p>
                <div className="flex flex-wrap justify-center md:justify-start gap-4 mt-3">
                    <span className="text-sm bg-white px-3 py-1 rounded-full border border-gray-200 text-gray-600 font-medium">
                        <i className="fas fa-graduation-cap mr-2 text-primary"></i> {student.internshipAgreement?.degreeProgram || 'N/A'}
                    </span>
                    <span className="text-sm bg-white px-3 py-1 rounded-full border border-gray-200 text-gray-600 font-medium">
                        <i className="fas fa-book-open mr-2 text-primary"></i> Semester {student.semester || 'N/A'}
                    </span>
                    <span className="text-sm bg-white px-3 py-1 rounded-full border border-gray-200 text-gray-600 font-medium">
                        <i className="fas fa-layer-group mr-2 text-primary"></i> Section {student.section || 'N/A'}
                    </span>
                    <span className="text-sm bg-white px-3 py-1 rounded-full border border-gray-200 text-gray-600 font-medium font-bold text-primary">
                        <i className="fas fa-star mr-2"></i> CGPA: {student.cgpa || 'N/A'}
                    </span>
                </div>
            </div>
        </div>

        <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-10">
            {/* Academic & Contact Info */}
            <div className="space-y-6">
                <div>
                    <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">Student Contact</h3>
                    <div className="grid gap-4">
                        <InfoRow label="Institutional Email" value={student.email} icon="fa-envelope" />
                        <InfoRow 
                          label="Student Mobile" 
                          value={student.whatsappNumber || student.internshipAgreement?.contactNumber} 
                          icon="fa-mobile-screen-button" 
                        />
                        <InfoRow label="Registered Course" value={student.registeredCourse} icon="fa-scroll" />
                    </div>
                </div>

                <div>
                    <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">Internship Detail</h3>
                    <div className="grid gap-4">
                        <InfoRow label="Assigned Company" value={student.assignedCompany || student.internshipAgreement?.companyName} icon="fa-building" />
                        <InfoRow label="Status" value={student.status} icon="fa-info-circle" isBadge />
                    </div>
                </div>
            </div>

            {/* Site Supervisor Details */}
            <div className="space-y-6">
                <div>
                    <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">Site Supervisor Details</h3>
                    <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100 space-y-4">
                        <InfoRow label="Name" value={student.assignedCompanySupervisor || student.internshipAgreement?.companySupervisorName || student.internshipRequest?.siteSupervisorName || 'N/A'} icon="fa-user-tie" />
                        <InfoRow label="Email" value={student.internshipAgreement?.companySupervisorEmail || student.internshipRequest?.siteSupervisorEmail || 'N/A'} icon="fa-envelope" />
                        <InfoRow label="Mobile Number" value={student.internshipAgreement?.whatsappNumber || student.internshipRequest?.siteSupervisorPhone || 'N/A'} icon="fa-phone" />
                    </div>
                </div>
            </div>
        </div>
      </Card>
    </div>
  );
}

function InfoRow({ label, value, icon, isBadge }) {
    return (
        <div className="flex items-start gap-3">
            {icon && <div className="mt-1 text-primary text-sm w-5"><i className={`fas ${icon}`}></i></div>}
            <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider leading-none mb-1">{label}</p>
                <div className="text-gray-700 font-bold break-all">
                    {value || '—'}
                </div>
            </div>
        </div>
    );
}

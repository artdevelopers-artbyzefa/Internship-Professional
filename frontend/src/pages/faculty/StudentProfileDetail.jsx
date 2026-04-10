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
      if (!studentId || studentId === 'dashboard' || studentId.length !== 24) {
        navigate(-1);
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

  if (loading) return <ProfileSkeleton />;

  if (!student) {
    return (
        <div className="text-center p-12">
            <h2 className="text-2xl font-black text-gray-800 tracking-tight">Student not found</h2>
            <Button onClick={() => navigate(-1)} className="mt-4">Go Back</Button>
        </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between mb-4">
        <Button variant="outline" onClick={() => navigate(-1)}>
          <i className="fas fa-arrow-left mr-2"></i> Back
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

const ProfileSkeleton = () => (
    <div className="max-w-4xl mx-auto space-y-8 animate-pulse">
        <div className="flex items-center justify-between mb-8">
            <div className="h-10 w-24 bg-slate-100 rounded-xl"></div>
            <div className="h-10 w-28 bg-slate-100 rounded-full"></div>
        </div>

        <div className="bg-white border border-slate-100 rounded-[32px] overflow-hidden shadow-sm">
            <div className="bg-slate-50/50 p-10 border-b border-slate-100 flex flex-col md:flex-row items-center gap-10">
                <div className="w-36 h-36 rounded-[2rem] bg-white border-4 border-white shadow-sm flex-shrink-0"></div>
                <div className="text-center md:text-left space-y-4 flex-1">
                    <div className="h-8 w-64 bg-slate-200 rounded-xl mx-auto md:mx-0"></div>
                    <div className="h-4 w-32 bg-primary/10 rounded-full mx-auto md:mx-0"></div>
                    <div className="flex flex-wrap justify-center md:justify-start gap-4 mt-6">
                        {[...Array(4)].map((_, i) => (
                            <div key={i} className="h-10 w-32 bg-slate-50 border border-slate-100 rounded-full"></div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="p-10 grid grid-cols-1 md:grid-cols-2 gap-12">
                {[...Array(2)].map((_, i) => (
                    <div key={i} className="space-y-8">
                        <div>
                            <div className="h-3 w-32 bg-slate-100 rounded-full mb-6"></div>
                            <div className="space-y-6">
                                {[...Array(3)].map((_, j) => (
                                    <div key={j} className="flex gap-4">
                                        <div className="w-5 h-5 bg-slate-50 rounded-lg"></div>
                                        <div className="space-y-2 flex-1">
                                            <div className="h-2 w-16 bg-slate-50 rounded-full"></div>
                                            <div className="h-4 w-48 bg-slate-100 rounded-lg"></div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    </div>
);

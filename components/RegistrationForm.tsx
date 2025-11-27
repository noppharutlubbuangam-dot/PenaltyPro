

import React, { useState, useEffect, useRef } from 'react';
import { Upload, ArrowLeft, CheckCircle, School, User, FileText, Search, Image as ImageIcon, CreditCard, AlertCircle, X, Printer, Loader2, Share2, Plus, Trash2, Calendar, Camera } from 'lucide-react';
import { registerTeam, fileToBase64 } from '../services/sheetService';
import { shareRegistration } from '../services/liffService';
import { RegistrationData, AppSettings, School as SchoolType } from '../types';

interface RegistrationFormProps {
  onBack: () => void;
  schools: SchoolType[];
  config: AppSettings;
  showNotification?: (title: string, message: string, type: 'success' | 'error' | 'info') => void;
}

const MAX_IMAGE_SIZE = 2 * 1024 * 1024; // 2MB
const MAX_DOC_SIZE = 3 * 1024 * 1024;   // 3MB

// Utility to compress image
const compressImage = async (file: File): Promise<File> => {
    if (file.type === 'application/pdf') return file; // Skip PDF
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 1024;
                const scaleSize = MAX_WIDTH / img.width;
                const width = (scaleSize < 1) ? MAX_WIDTH : img.width;
                const height = (scaleSize < 1) ? img.height * scaleSize : img.height;

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx?.drawImage(img, 0, 0, width, height);

                canvas.toBlob((blob) => {
                    if (blob) {
                        const newFile = new File([blob], file.name, {
                            type: 'image/jpeg',
                            lastModified: Date.now(),
                        });
                        resolve(newFile);
                    } else {
                        reject(new Error('Canvas is empty'));
                    }
                }, 'image/jpeg', 0.7); // 70% Quality
            };
        };
        reader.onerror = (error) => reject(error);
    });
};

const RegistrationForm: React.FC<RegistrationFormProps> = ({ onBack, schools, config, showNotification }) => {
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [registeredData, setRegisteredData] = useState<RegistrationData | null>(null);
  const [registeredTeamId, setRegisteredTeamId] = useState<string | null>(null);
  
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStage, setUploadStage] = useState('');

  // 1. School & Team Info
  const [schoolName, setSchoolName] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [district, setDistrict] = useState('');
  const [province, setProvince] = useState('กาญจนบุรี');
  const [phone, setPhone] = useState('');
  
  // Dual Colors
  const [primaryColor, setPrimaryColor] = useState('#2563EB');
  const [secondaryColor, setSecondaryColor] = useState('#FFFFFF');

  const [teamLogo, setTeamLogo] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  // 2. Personnel Info
  const [directorName, setDirectorName] = useState('');
  const [managerName, setManagerName] = useState('');
  const [managerPhone, setManagerPhone] = useState('');
  const [coachName, setCoachName] = useState('');
  const [coachPhone, setCoachPhone] = useState('');

  // 3. Players (Dynamic)
  const [players, setPlayers] = useState(Array(7).fill(null).map((_, i) => ({
    sequence: i + 1,
    name: '',
    number: '', // Added number field
    birthDate: '',
    photoFile: null as File | null,
    photoPreview: null as string | null
  })));

  // 4. Documents
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [slipFile, setSlipFile] = useState<File | null>(null);
  const [slipPreview, setSlipPreview] = useState<string | null>(null);

  // PDF Generation Logic (Print Window)
  const handleDownloadPDF = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
        alert("Pop-up blocked. Please allow pop-ups to print.");
        return;
    }

    const playersHtml = players.map(p => `
        <tr style="border-bottom: 1px solid #ddd;">
            <td style="padding: 8px; text-align: center;">${p.sequence}</td>
            <td style="padding: 8px; text-align: center;">${p.number || '-'}</td>
            <td style="padding: 8px;">${p.name || '-'}</td>
            <td style="padding: 8px; text-align: center;">${p.birthDate || '-'}</td>
            <td style="padding: 4px; text-align: center;">
                ${p.photoPreview 
                    ? `<img src="${p.photoPreview}" style="width: 40px; height: 50px; object-fit: cover; border-radius: 4px; border: 1px solid #eee;" />` 
                    : '<span style="color:#ccc;">-</span>'}
            </td>
        </tr>
    `).join('');

    const htmlContent = `
      <html>
        <head>
          <title>ใบสมัคร - ${schoolName}</title>
          <link href="https://fonts.googleapis.com/css2?family=Kanit:wght@300;400;700&display=swap" rel="stylesheet">
          <style>
            body { font-family: 'Kanit', sans-serif; padding: 40px; color: #333; line-height: 1.5; }
            .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #333; padding-bottom: 20px; }
            .section { margin-bottom: 20px; break-inside: avoid; }
            .section-title { font-size: 16px; font-weight: bold; background: #f0f0f0; padding: 5px 10px; margin-bottom: 10px; border-left: 4px solid #333; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 10px; font-size: 14px; }
            .label { font-weight: bold; color: #666; }
            .value { font-size: 14px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th { background: #eee; padding: 8px; text-align: left; font-size: 14px; border-bottom: 2px solid #ddd; }
            td { padding: 8px; font-size: 14px; }
            .footer { margin-top: 40px; text-align: center; font-size: 12px; color: #888; border-top: 1px solid #ddd; padding-top: 20px; }
            @media print { button { display: none; } body { padding: 0; } }
          </style>
        </head>
        <body>
          <div class="header">
            <h1 style="margin: 0; font-size: 24px;">ใบสมัครเข้าร่วมการแข่งขัน</h1>
            <h2 style="margin: 5px 0; font-size: 18px;">${config.competitionName}</h2>
          </div>

          <div class="section">
            <div class="section-title">1. ข้อมูลทีม / โรงเรียน</div>
            <div class="grid">
               <div><span class="label">ชื่อทีม/โรงเรียน:</span> <span class="value">${schoolName}</span></div>
               <div><span class="label">สังกัด:</span> <span class="value">${district}, ${province}</span></div>
               <div><span class="label">เบอร์โทรศัพท์:</span> <span class="value">${phone}</span></div>
               <div><span class="label">สีประจำทีม:</span> <div style="display:inline-block; width:20px; height:20px; background:${primaryColor}; border:1px solid #ccc; vertical-align:middle;"></div> <div style="display:inline-block; width:20px; height:20px; background:${secondaryColor}; border:1px solid #ccc; vertical-align:middle;"></div></div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">2. คณะผู้ควบคุมทีม</div>
             <div class="grid">
               <div><span class="label">ผู้อำนวยการ:</span> <span class="value">${directorName}</span></div>
               <div></div>
               <div><span class="label">ผู้จัดการทีม:</span> <span class="value">${managerName}</span></div>
               <div><span class="label">เบอร์โทร:</span> <span class="value">${managerPhone}</span></div>
               <div><span class="label">ผู้ฝึกสอน:</span> <span class="value">${coachName}</span></div>
               <div><span class="label">เบอร์โทร:</span> <span class="value">${coachPhone}</span></div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">3. รายชื่อนักกีฬา (${players.length} คน)</div>
            <table>
                <thead>
                    <tr>
                        <th style="width: 40px; text-align: center;">#</th>
                        <th style="width: 40px; text-align: center;">เบอร์</th>
                        <th>ชื่อ - นามสกุล</th>
                        <th style="width: 120px; text-align: center;">วัน/เดือน/ปีเกิด</th>
                        <th style="width: 60px; text-align: center;">รูปถ่าย</th>
                    </tr>
                </thead>
                <tbody>
                    ${playersHtml}
                </tbody>
            </table>
          </div>
          
          <div class="footer">
             เอกสารนี้ถูกสร้างจากระบบ Penalty Pro Recorder | ลงทะเบียนเมื่อ: ${new Date().toLocaleString('th-TH')}
             <br/><br/>
             <div style="display: flex; justify-content: space-between; margin-top: 40px; padding: 0 50px;">
                <div style="text-align: center;">
                    .......................................................<br/>
                    ( ${managerName || '.......................................'} )<br/>
                    ผู้จัดการทีม
                </div>
                <div style="text-align: center;">
                    .......................................................<br/>
                    ( ${directorName || '.......................................'} )<br/>
                    ผู้อำนวยการโรงเรียน
                </div>
             </div>
          </div>

          <script>
             window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  const handleShare = () => {
      if (registeredData && registeredTeamId) {
          shareRegistration(registeredData, registeredTeamId);
      }
  };

  useEffect(() => {
    if (teamLogo) {
        const url = URL.createObjectURL(teamLogo);
        setLogoPreview(url);
        return () => URL.revokeObjectURL(url);
    }
  }, [teamLogo]);

  useEffect(() => {
    if (slipFile) {
        const url = URL.createObjectURL(slipFile);
        setSlipPreview(url);
        return () => URL.revokeObjectURL(url);
    }
  }, [slipFile]);

  const notify = (title: string, msg: string, type: 'success' | 'error' | 'info') => {
      if (showNotification) showNotification(title, msg, type);
      else alert(`${title}: ${msg}`);
  };

  const validateFile = (file: File, type: 'image' | 'doc') => {
    const limit = type === 'image' ? MAX_IMAGE_SIZE : MAX_DOC_SIZE;
    if (file.size > limit) {
        notify("ไฟล์ใหญ่เกินไป", `ขนาดไฟล์ต้องไม่เกิน ${limit / 1024 / 1024}MB (ระบบจะพยายามบีบอัด)`, "info");
        if(type === 'doc') return false; 
    }
    return true;
  };

  const updatePlayer = (index: number, field: string, value: any) => {
    const newPlayers = [...players];
    if (field === 'photoFile' && value) {
        compressImage(value).then(compressed => {
             const url = URL.createObjectURL(compressed);
             newPlayers[index] = { ...newPlayers[index], photoFile: compressed, photoPreview: url };
             setPlayers(newPlayers);
        }).catch(err => {
             console.error("Compression failed", err);
             const url = URL.createObjectURL(value);
             newPlayers[index] = { ...newPlayers[index], photoFile: value, photoPreview: url };
             setPlayers(newPlayers);
        });
    } else {
        newPlayers[index] = { ...newPlayers[index], [field]: value };
        setPlayers(newPlayers); // Ensure state updates for regular fields too
    }
  };
  
  const updatePlayerDate = (index: number, value: string) => {
      let cleaned = value.replace(/[^0-9]/g, '');
      if (cleaned.length > 8) cleaned = cleaned.substring(0, 8);
      
      let formatted = cleaned;
      if (cleaned.length > 2) {
          formatted = cleaned.substring(0, 2) + '/' + cleaned.substring(2);
      }
      if (cleaned.length > 4) {
          formatted = formatted.substring(0, 5) + '/' + cleaned.substring(4);
      }
      
      updatePlayer(index, 'birthDate', formatted);
  };

  const handleDateSelect = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
      if (e.target.value) {
          const date = new Date(e.target.value);
          const day = String(date.getDate()).padStart(2, '0');
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const year = date.getFullYear() + 543; // Convert to BE
          updatePlayer(index, 'birthDate', `${day}/${month}/${year}`);
      }
  };

  const addPlayer = () => {
      setPlayers([...players, {
          sequence: players.length + 1,
          name: '',
          number: '',
          birthDate: '',
          photoFile: null,
          photoPreview: null
      }]);
  };

  const removePlayer = (index: number) => {
      const newPlayers = players.filter((_, i) => i !== index).map((p, i) => ({ ...p, sequence: i + 1 }));
      setPlayers(newPlayers);
  };

  const handleLogoChange = async (file: File) => {
      try {
        const compressed = await compressImage(file);
        setTeamLogo(compressed);
      } catch (e) { setTeamLogo(file); }
  };

  const handleDocChange = (file: File) => {
      if (validateFile(file, 'doc')) {
          setDocumentFile(file);
      }
  };

  const handleSlipChange = async (file: File) => {
      try {
        const compressed = await compressImage(file);
        setSlipFile(compressed);
      } catch (e) { setSlipFile(file); }
  };

  const handleSchoolSelect = (school: SchoolType) => {
    setSchoolName(school.name);
    setDistrict(school.district);
    setProvince(school.province);
    setShowSuggestions(false);
  };

  const filteredSchools = schools.filter(s => 
    s.name.toLowerCase().includes(schoolName.toLowerCase()) && schoolName.length > 0
  );

  // Helper to generate Thai-English Acronym (Mock)
  const generateThaiAcronym = (name: string): string => {
      if (/^[A-Za-z0-9\s]+$/.test(name)) {
          const parts = name.split(/\s+/);
          if (parts.length === 1) return name.substring(0, 3).toUpperCase();
          return parts.slice(0, 3).map(p => p[0]).join('').toUpperCase();
      }
      return "T" + Math.floor(Math.random() * 100).toString().padStart(2, '0');
  };

  const handleSubmit = async () => {
    if (!documentFile || !slipFile) {
        notify("ข้อมูลไม่ครบ", "กรุณาแนบเอกสารและหลักฐานการโอนเงิน", "error");
        return;
    }
    if (!schoolName) {
        notify("ข้อมูลไม่ครบ", "กรุณาระบุชื่อโรงเรียน", "error");
        return;
    }

    setIsSubmitting(true);
    setUploadProgress(10);
    setUploadStage("เตรียมข้อมูล...");

    try {
      setUploadStage("กำลังบีบอัดและอัปโหลดโลโก้ทีม...");
      const logoBase64 = teamLogo ? await fileToBase64(teamLogo) : null;
      setUploadProgress(25);

      setUploadStage("กำลังอัปโหลดเอกสาร...");
      const docBase64 = await fileToBase64(documentFile);
      const slipBase64 = await fileToBase64(slipFile);
      setUploadProgress(40);

      setUploadStage("กำลังประมวลผลข้อมูลผู้เล่น...");
      const processedPlayers = await Promise.all(players.map(async (p, idx) => {
        if (p.photoFile) setUploadStage(`กำลังอัปโหลดรูปนักกีฬาคนที่ ${p.sequence}...`);
        return {
            sequence: p.sequence, // Keep sequence but might be mapped to number in backend
            name: p.name,
            number: p.number, // Send number specifically
            birthDate: p.birthDate,
            photoFile: p.photoFile ? await fileToBase64(p.photoFile) : null
        };
      }));
      setUploadProgress(80);

      const validPlayers = processedPlayers.filter(p => p.name.trim() !== '');
      const combinedColors = JSON.stringify([primaryColor, secondaryColor]);
      const shortName = generateThaiAcronym(schoolName);

      const payload: RegistrationData = {
        schoolName,
        shortName,
        district,
        province,
        phone,
        directorName,
        managerName,
        managerPhone,
        coachName,
        coachPhone,
        color: combinedColors,
        logoFile: logoBase64,
        documentFile: docBase64,
        slipFile: slipBase64,
        players: validPlayers.map(p => ({
            sequence: parseInt(p.number || p.sequence.toString()), // Prefer jersey number if available
            name: p.name,
            birthDate: p.birthDate,
            photoFile: p.photoFile
        })),
        registrationTime: new Date().toISOString()
      };

      setUploadStage("กำลังบันทึกลงฐานข้อมูล...");
      const teamId = await registerTeam(payload);
      
      if (teamId) {
          setRegisteredData(payload);
          setRegisteredTeamId(teamId);
          setUploadProgress(100);
          setUploadStage("เสร็จสิ้น!");
          setIsSuccess(true);
      } else {
          throw new Error("Server did not return Team ID");
      }
    } catch (error) {
      console.error(error);
      notify("ผิดพลาด", "เกิดข้อผิดพลาดในการส่งข้อมูล (โปรดลองใหม่)", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center bg-white rounded-2xl shadow-xl border border-green-100">
        <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mb-6 animate-bounce">
          <CheckCircle className="w-12 h-12 text-green-600" />
        </div>
        <h2 className="text-3xl font-bold text-slate-800 mb-2">ลงทะเบียนเรียบร้อย</h2>
        <p className="text-slate-500 mb-8 text-lg">ข้อมูลใบสมัครและเอกสารของคุณถูกส่งเข้าสู่ระบบแล้ว<br/>สถานะปัจจุบัน: <span className="text-yellow-600 font-bold">รอตรวจสอบ (Pending)</span></p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-2xl">
            <button onClick={handleDownloadPDF} className="px-6 py-3 bg-slate-800 hover:bg-slate-900 text-white rounded-xl shadow font-bold text-lg transition flex items-center justify-center gap-2">
                <Printer className="w-5 h-5" /> พิมพ์ PDF
            </button>
            <button onClick={handleShare} className="px-6 py-3 bg-[#06C755] hover:bg-[#05b34c] text-white rounded-xl shadow font-bold text-lg transition flex items-center justify-center gap-2">
                <Share2 className="w-5 h-5" /> แชร์ LINE
            </button>
            <button onClick={onBack} className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-lg shadow-indigo-200 font-bold text-lg transition">
                กลับหน้าหลัก
            </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200 my-8 relative">
      
      {isSubmitting && (
          <div className="absolute inset-0 z-[60] bg-white/95 backdrop-blur-sm flex flex-col items-center justify-center p-8">
              <div className="w-full max-w-md space-y-6 text-center">
                  <div className="relative w-24 h-24 mx-auto">
                      <div className="absolute inset-0 border-4 border-slate-100 rounded-full"></div>
                      <div className="absolute inset-0 border-4 border-indigo-600 rounded-full border-t-transparent animate-spin"></div>
                      <div className="absolute inset-0 flex items-center justify-center font-bold text-indigo-600">{uploadProgress}%</div>
                  </div>
                  <div>
                      <h3 className="text-xl font-bold text-slate-800 mb-2">{uploadStage}</h3>
                      <p className="text-sm text-slate-500">กรุณาอย่าปิดหน้าต่างนี้จนกว่าจะเสร็จสิ้น</p>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden w-full">
                      <div className="h-full bg-indigo-600 transition-all duration-300" style={{ width: `${uploadProgress}%` }}></div>
                  </div>
              </div>
          </div>
      )}

      {/* Header */}
      <div className="bg-indigo-900 p-6 text-white flex items-center gap-4 sticky top-0 z-50 shadow-lg">
        <button onClick={onBack} className="hover:bg-white/10 p-2 rounded-full transition">
            <ArrowLeft className="w-6 h-6" />
        </button>
        <div>
            <h2 className="font-bold text-2xl">ใบสมัครแข่งขัน</h2>
            <p className="text-indigo-200 text-sm">{config.competitionName}</p>
        </div>
      </div>

      <div className="p-8">
        {/* Steps Indicator */}
        <div className="flex justify-center mb-10">
            <div className="flex items-center gap-2">
                {[1, 2, 3, 4].map((i) => (
                    <React.Fragment key={i}>
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all ${step === i ? 'bg-indigo-600 text-white scale-110 ring-4 ring-indigo-100' : step > i ? 'bg-green-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
                            {step > i ? <CheckCircle className="w-6 h-6" /> : i}
                        </div>
                        {i < 4 && <div className={`w-12 h-1 ${step > i ? 'bg-green-500' : 'bg-slate-100'}`}></div>}
                    </React.Fragment>
                ))}
            </div>
        </div>

        {/* Step 1: School Info */}
        {step === 1 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-8">
            <div className="flex items-center gap-2 text-xl font-bold text-slate-800 border-b pb-2">
                <School className="w-6 h-6 text-indigo-600" />
                <h3>1. ข้อมูลโรงเรียน (สังกัด)</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="col-span-2 relative">
                    <label className="block text-sm font-medium text-slate-700 mb-1">ชื่อโรงเรียน</label>
                    <div className="relative">
                        <input 
                            type="text" 
                            value={schoolName} 
                            onChange={e => { setSchoolName(e.target.value); setShowSuggestions(true); }} 
                            onFocus={() => setShowSuggestions(true)}
                            className="w-full p-3 pl-10 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500" 
                            placeholder="ค้นหาโรงเรียนในสังกัด..." 
                        />
                        <Search className="absolute left-3 top-3.5 w-5 h-5 text-slate-400" />
                    </div>
                    {showSuggestions && filteredSchools.length > 0 && (
                        <div className="absolute z-10 w-full bg-white border border-slate-200 rounded-lg shadow-lg mt-1 max-h-60 overflow-y-auto">
                            {filteredSchools.map(s => (
                                <div 
                                    key={s.id} 
                                    className="p-3 hover:bg-indigo-50 cursor-pointer text-slate-700 border-b border-slate-50 last:border-0 flex justify-between"
                                    onClick={() => handleSchoolSelect(s)}
                                >
                                    <span>{s.name}</span>
                                    <span className="text-xs text-slate-400">{s.district}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">อำเภอ</label>
                    <input type="text" value={district} onChange={e => setDistrict(e.target.value)} className="w-full p-3 border border-slate-300 rounded-lg" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">จังหวัด</label>
                    <input type="text" value={province} onChange={e => setProvince(e.target.value)} className="w-full p-3 border border-slate-300 rounded-lg" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">เบอร์โทรศัพท์โรงเรียน</label>
                    <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} className="w-full p-3 border border-slate-300 rounded-lg" placeholder="0xx-xxxxxxx" />
                </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mt-4">
                <h4 className="font-bold text-slate-700 mb-4">อัตลักษณ์ทีม (เลือก 2 สี)</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">สีหลัก (Primary)</label>
                        <div className="flex items-center gap-3">
                            <input type="color" value={primaryColor} onChange={e => setPrimaryColor(e.target.value)} className="w-12 h-12 rounded-lg cursor-pointer border-0 p-0" />
                            <span className="text-sm text-slate-500 font-mono">{primaryColor}</span>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">สีรอง (Secondary)</label>
                        <div className="flex items-center gap-3">
                            <input type="color" value={secondaryColor} onChange={e => setSecondaryColor(e.target.value)} className="w-12 h-12 rounded-lg cursor-pointer border-0 p-0" />
                            <span className="text-sm text-slate-500 font-mono">{secondaryColor}</span>
                        </div>
                    </div>
                    
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-slate-700 mb-1">ตราสโมสร/โรงเรียน <span className="text-xs text-slate-400">(ระบบจะย่อขนาดให้อัตโนมัติ)</span></label>
                        <div className="flex items-center gap-4">
                             {logoPreview && (
                                <div className="w-16 h-16 rounded-lg border bg-white p-1 relative group">
                                     <img src={logoPreview} className="w-full h-full object-contain" />
                                     <button 
                                        onClick={() => {setTeamLogo(null); setLogoPreview(null);}} 
                                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 shadow-sm"
                                     >
                                         <X className="w-3 h-3"/>
                                     </button>
                                </div>
                             )}
                             <label className="flex-1 flex items-center gap-3 p-3 border border-dashed border-slate-300 rounded-lg cursor-pointer hover:bg-white transition">
                                <Upload className="w-5 h-5 text-slate-400" />
                                <span className="text-sm text-slate-600 truncate">{teamLogo ? teamLogo.name : 'อัปโหลดไฟล์ภาพ (PNG/JPG)'}</span>
                                <input type="file" accept="image/*" onChange={e => e.target.files?.[0] && handleLogoChange(e.target.files[0])} className="hidden" />
                             </label>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        )}

        {/* Step 2: Personnel */}
        {step === 2 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-8">
            <div className="flex items-center gap-2 text-xl font-bold text-slate-800 border-b pb-2">
                <User className="w-6 h-6 text-indigo-600" />
                <h3>2. คณะผู้ควบคุมทีม</h3>
            </div>

            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">ผู้อำนวยการโรงเรียน</label>
                    <input type="text" value={directorName} onChange={e => setDirectorName(e.target.value)} className="w-full p-3 border border-slate-300 rounded-lg" placeholder="ชื่อ-นามสกุล ผอ." />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">ผู้ควบคุมทีม (ผู้จัดการ)</label>
                        <input type="text" value={managerName} onChange={e => setManagerName(e.target.value)} className="w-full p-3 border border-slate-300 rounded-lg" placeholder="ชื่อ-นามสกุล" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">เบอร์โทรศัพท์ (ผู้ควบคุม)</label>
                        <input type="tel" value={managerPhone} onChange={e => setManagerPhone(e.target.value)} className="w-full p-3 border border-slate-300 rounded-lg" />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">ผู้ฝึกสอน (โค้ช)</label>
                        <input type="text" value={coachName} onChange={e => setCoachName(e.target.value)} className="w-full p-3 border border-slate-300 rounded-lg" placeholder="ชื่อ-นามสกุล" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">เบอร์โทรศัพท์ (โค้ช)</label>
                        <input type="tel" value={coachPhone} onChange={e => setCoachPhone(e.target.value)} className="w-full p-3 border border-slate-300 rounded-lg" />
                    </div>
                </div>
            </div>
          </div>
        )}

        {/* Step 3: Players */}
        {step === 3 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-8">
             <div className="flex items-center gap-2 text-xl font-bold text-slate-800 border-b pb-2 justify-between">
                <div className="flex items-center gap-2">
                    <User className="w-6 h-6 text-indigo-600" />
                    <h3>3. รายชื่อนักกีฬา ({players.length} คน)</h3>
                </div>
                <button onClick={addPlayer} className="flex items-center gap-1 text-xs bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700 transition font-bold">
                    <Plus className="w-4 h-4" /> เพิ่มคน
                </button>
            </div>
            <p className="text-sm text-slate-500 bg-blue-50 p-3 rounded-lg flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-blue-600" /> เลือกรูปถ่ายโดยการคลิกที่ไอคอนกล้อง
            </p>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {players.map((player, index) => (
                    <div key={index} className="flex items-start gap-3 p-3 bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition relative group">
                        {/* Photo Section (Left) */}
                        <div className="w-20 h-24 bg-slate-100 rounded-lg overflow-hidden shrink-0 border border-slate-200 relative group-hover:border-indigo-300 transition-colors">
                            {player.photoPreview ? (
                                <img src={player.photoPreview} className="w-full h-full object-cover" alt="Preview" />
                            ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center text-slate-300">
                                    <User className="w-8 h-8 mb-1" />
                                    <span className="text-[10px] font-bold">No Photo</span>
                                </div>
                            )}
                            <label className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer transition">
                                <Camera className="w-6 h-6 text-white" />
                                <input 
                                    type="file" 
                                    accept="image/*" 
                                    className="hidden" 
                                    onChange={(e) => updatePlayer(index, 'photoFile', e.target.files?.[0] || null)} 
                                />
                            </label>
                        </div>

                        {/* Inputs Section (Right) */}
                        <div className="flex-1 min-w-0 flex flex-col justify-center h-full py-1 space-y-2">
                            <div className="flex gap-2">
                                {/* Number / Sequence */}
                                <div className="w-16">
                                    <input 
                                        type="number"
                                        value={player.number}
                                        onChange={(e) => updatePlayer(index, 'number', e.target.value)}
                                        className="w-full p-1.5 text-xs border border-slate-300 rounded text-center font-bold bg-slate-50 focus:bg-white focus:ring-1 focus:ring-indigo-500 outline-none"
                                        placeholder="เบอร์"
                                    />
                                </div>
                                {/* Name */}
                                <div className="flex-1">
                                    <input 
                                        type="text" 
                                        value={player.name}
                                        onChange={(e) => updatePlayer(index, 'name', e.target.value)}
                                        className="w-full p-1.5 text-xs border border-slate-300 rounded focus:ring-1 focus:ring-indigo-500 outline-none" 
                                        placeholder="ชื่อ-นามสกุล" 
                                    />
                                </div>
                            </div>

                            {/* Birth Date */}
                            <div className="relative">
                                <input 
                                    type="text" 
                                    value={player.birthDate || ''}
                                    onChange={(e) => updatePlayerDate(index, e.target.value)}
                                    className="w-full p-1.5 pl-7 text-xs border border-slate-300 rounded focus:ring-1 focus:ring-indigo-500 outline-none"
                                    placeholder="วว/ดด/ปปปป"
                                    maxLength={10}
                                />
                                <div 
                                    className="absolute left-2 top-1.5 cursor-pointer text-slate-400 hover:text-indigo-600"
                                    onClick={() => (document.getElementById(`date-picker-${index}`) as HTMLInputElement)?.showPicker()}
                                >
                                    <Calendar className="w-3.5 h-3.5" />
                                </div>
                                <input 
                                    type="date" 
                                    id={`date-picker-${index}`}
                                    className="sr-only" 
                                    onChange={(e) => handleDateSelect(e, index)}
                                />
                            </div>

                            {/* Delete Button (if > 1 player) */}
                            {players.length > 1 && (
                                <button onClick={() => removePlayer(index)} className="text-red-500 text-[10px] flex items-center gap-1 hover:bg-red-50 px-2 py-1 rounded transition w-fit"><Trash2 className="w-3 h-3" /> ลบคนนี้</button>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
        )}

        {/* Step 4: Documents */}
        {step === 4 && (
           <div className="space-y-6 animate-in fade-in slide-in-from-right-8">
             <div className="flex items-center gap-2 text-xl font-bold text-slate-800 border-b pb-2">
                <FileText className="w-6 h-6 text-indigo-600" />
                <h3>4. เอกสารหลักฐาน</h3>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
                <CreditCard className="w-6 h-6 text-blue-600 mt-1 shrink-0" />
                <div>
                    <h4 className="font-bold text-blue-800">รายละเอียดการชำระค่าสมัคร</h4>
                    <p className="text-blue-700 text-sm">{config.bankName}</p>
                    <p className="text-xl font-mono font-bold text-blue-900 my-1">{config.bankAccount}</p>
                    <p className="text-blue-700 text-sm">ชื่อบัญชี: {config.accountName}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6">
                <div className={`border-2 border-dashed rounded-xl p-8 text-center transition ${documentFile ? 'border-indigo-400 bg-indigo-50' : 'border-slate-300 bg-slate-50'}`}>
                    <FileText className={`w-12 h-12 mx-auto mb-3 ${documentFile ? 'text-indigo-500' : 'text-slate-400'}`} />
                    <h4 className="font-bold text-slate-700">เอกสารใบสมัคร (PDF/Doc) <span className="text-xs text-red-500 block font-normal mt-1">*ขนาดไม่เกิน 3MB</span></h4>
                    <p className="text-sm text-slate-500 mb-4">อัปโหลดไฟล์ใบสมัครที่มีลายเซ็นครบถ้วน</p>
                    <input type="file" id="doc-upload" accept=".pdf,.doc,.docx" className="hidden" onChange={e => e.target.files?.[0] && handleDocChange(e.target.files[0])} />
                    <label htmlFor="doc-upload" className="inline-block bg-indigo-600 text-white px-6 py-2 rounded-lg cursor-pointer hover:bg-indigo-700 transition">
                        {documentFile ? 'เปลี่ยนไฟล์' : 'เลือกไฟล์'}
                    </label>
                    {documentFile && <p className="mt-2 text-sm font-bold text-indigo-700">{documentFile.name}</p>}
                </div>

                <div className={`border-2 border-dashed rounded-xl p-8 text-center transition ${slipFile ? 'border-pink-400 bg-pink-50' : 'border-slate-300 bg-slate-50'}`}>
                    {slipPreview ? (
                        <div className="mb-4">
                            <img src={slipPreview} alt="Slip" className="h-48 mx-auto object-contain rounded shadow-sm" />
                        </div>
                    ) : (
                        <ImageIcon className={`w-12 h-12 mx-auto mb-3 text-slate-400`} />
                    )}
                    <h4 className="font-bold text-slate-700">หลักฐานการโอนเงิน (Slip) <span className="text-xs text-red-500 block font-normal mt-1">*ระบบจะย่อขนาดอัตโนมัติ</span></h4>
                    <p className="text-sm text-slate-500 mb-4">อัปโหลดรูปสลิปการโอนเงิน</p>
                    <input type="file" id="slip-upload" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && handleSlipChange(e.target.files[0])} />
                    <label htmlFor="slip-upload" className="inline-block bg-pink-600 text-white px-6 py-2 rounded-lg cursor-pointer hover:bg-pink-700 transition">
                        {slipFile ? 'เปลี่ยนรูปภาพ' : 'อัปโหลดสลิป'}
                    </label>
                    {slipFile && <p className="mt-2 text-sm font-bold text-pink-700">{slipFile.name}</p>}
                </div>
            </div>
           </div>
        )}

        <div className="flex justify-between mt-10 pt-6 border-t border-slate-100">
            {step > 1 ? (
                <button onClick={() => setStep(step - 1)} className="px-6 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition">
                    ย้อนกลับ
                </button>
            ) : <div></div>}
            
            {step < 4 ? (
                <button onClick={() => setStep(step + 1)} className="px-8 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-900 transition flex items-center gap-2">
                    ถัดไป <ArrowLeft className="w-4 h-4 rotate-180" />
                </button>
            ) : (
                <button 
                    onClick={handleSubmit} 
                    disabled={isSubmitting}
                    className="px-8 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition flex items-center gap-2 shadow-lg shadow-indigo-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isSubmitting ? 'กำลังส่งข้อมูล...' : 'ยืนยันการสมัคร'}
                </button>
            )}
        </div>

      </div>
    </div>
  );
};

export default RegistrationForm;

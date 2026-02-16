import React from 'react';
import { useAppContext } from '../AppContext';
import { QRCodeSVG } from 'qrcode.react';

const BranchQR: React.FC = () => {
    const { branches } = useAppContext();

    const handlePrint = (branchId: string) => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        const qrElement = document.getElementById(`qr-${branchId}`);
        if (!qrElement) return;

        printWindow.document.write(`
      <html>
        <head>
          <title>Branch QR Code - ${branches.find(b => b.id === branchId)?.name}</title>
          <style>
            body {
              margin: 0;
              padding: 40px;
              display: flex;
              flex-direction: column;
              align-items: center;
              font-family: Arial, sans-serif;
            }
            .qr-container {
              text-align: center;
              padding: 40px;
              border: 4px solid #000;
              border-radius: 20px;
            }
            h1 {
              font-size: 32px;
              margin-bottom: 20px;
              font-weight: bold;
            }
            .instructions {
              margin-top: 30px;
              font-size: 18px;
              max-width: 600px;
              line-height: 1.6;
            }
          </style>
        </head>
        <body>
          <div class="qr-container">
            ${qrElement.innerHTML}
            <h1>${branches.find(b => b.id === branchId)?.name}</h1>
            <p style="font-size: 24px; font-weight: bold;">Scan to Check In</p>
          </div>
          <div class="instructions">
            <h2>Instructions:</h2>
            <ul>
              <li>Display this QR code at the branch entrance</li>
              <li>Staff and Members scan this code to record attendance</li>
              <li>QR code is permanent - no need to replace</li>
            </ul>
          </div>
        </body>
      </html>
    `);
        printWindow.document.close();
        printWindow.print();
    };

    return (
        <div className="max-w-6xl mx-auto space-y-8">
            <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-8 rounded-[3rem] text-white shadow-2xl">
                <div className="flex items-center gap-4 mb-3">
                    <div className="bg-white/20 backdrop-blur-md p-3 rounded-2xl">
                        <i className="fas fa-qrcode text-3xl"></i>
                    </div>
                    <div>
                        <h1 className="text-4xl font-black uppercase tracking-tight">Branch QR Codes</h1>
                        <p className="text-blue-100 font-medium text-sm">Generate & Print Attendance QR Codes</p>
                    </div>
                </div>
            </div>

            <div className="bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-200 p-6 rounded-[2rem]">
                <div className="flex gap-4">
                    <div className="bg-amber-500 w-12 h-12 rounded-2xl flex items-center justify-center shrink-0">
                        <i className="fas fa-info-circle text-white text-xl"></i>
                    </div>
                    <div>
                        <h3 className="font-black text-amber-900 uppercase text-sm mb-2">Important: Static QR Codes</h3>
                        <p className="text-amber-800 font-medium text-sm leading-relaxed">
                            These QR codes are <strong>permanent and never change</strong>. Print them once and display at your branch entrance.
                            Staff and members scan these to record attendance automatically.
                        </p>
                    </div>
                </div>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
                {branches.map((branch) => (
                    <div key={branch.id} className="bg-white p-8 rounded-[2.5rem] shadow-xl border-4 border-slate-100">
                        <div className="text-center mb-6">
                            <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight mb-2">{branch.name}</h2>
                            <p className="text-slate-500 font-bold text-xs uppercase tracking-widest">{branch.address}</p>
                        </div>

                        <div id={`qr-${branch.id}`} className="flex justify-center mb-6 bg-slate-50 p-8 rounded-[2rem]">
                            <QRCodeSVG
                                value={branch.id}
                                size={280}
                                level="H"
                                includeMargin={true}
                            />
                        </div>

                        <div className="bg-slate-50 p-6 rounded-[2rem] mb-6">
                            <div className="grid grid-cols-2 gap-4 text-center">
                                <div>
                                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Branch ID</p>
                                    <p className="text-lg font-black text-slate-700">{branch.id}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Type</p>
                                    <p className="text-lg font-black text-slate-700">Static</p>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <button
                                onClick={() => handlePrint(branch.id)}
                                className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-black text-sm uppercase tracking-widest rounded-2xl transition-all shadow-lg active:scale-[0.98] flex items-center justify-center gap-3"
                            >
                                <i className="fas fa-print"></i>
                                Print QR Code
                            </button>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => {
                                        const canvas = document.querySelector(`#qr-${branch.id} canvas`) as HTMLCanvasElement;
                                        if (canvas) {
                                            canvas.toBlob((blob) => {
                                                if (blob) {
                                                    const url = URL.createObjectURL(blob);
                                                    const a = document.createElement('a');
                                                    a.href = url;
                                                    a.download = `${branch.name.replace(/\\s+/g, '_')}_QR.png`;
                                                    a.click();
                                                }
                                            });
                                        }
                                    }}
                                    className="flex-1 py-3 bg-slate-200 hover:bg-slate-300 text-slate-700 font-black text-xs uppercase tracking-widest rounded-xl transition-all active:scale-[0.98]"
                                >
                                    <i className="fas fa-download mr-2"></i>
                                    Download
                                </button>

                                <button
                                    onClick={() => {
                                        navigator.clipboard.writeText(branch.id);
                                        alert('Branch ID copied to clipboard!');
                                    }}
                                    className="flex-1 py-3 bg-slate-200 hover:bg-slate-300 text-slate-700 font-black text-xs uppercase tracking-widest rounded-xl transition-all active:scale-[0.98]"
                                >
                                    <i className="fas fa-copy mr-2"></i>
                                    Copy ID
                                </button>
                            </div>
                        </div>

                        <div className="mt-6 bg-blue-50 border-2 border-blue-100 p-4 rounded-2xl">
                            <h4 className="font-black text-blue-900 text-xs uppercase mb-3 flex items-center gap-2">
                                <i className="fas fa-info-circle"></i>
                                How to Use
                            </h4>
                            <ul className="space-y-2 text-xs text-blue-800 font-medium">
                                <li className="flex gap-2">
                                    <span className="text-blue-500">1.</span>
                                    <span>Print or display this QR code at branch entrance</span>
                                </li>
                                <li className="flex gap-2">
                                    <span className="text-blue-500">2.</span>
                                    <span>Staff/Members scan using Check-In page</span>
                                </li>
                                <li className="flex gap-2">
                                    <span className="text-blue-500">3.</span>
                                    <span>Attendance is automatically recorded</span>
                                </li>
                            </ul>
                        </div>
                    </div>
                ))}
            </div>

            <div className="bg-slate-900 p-8 rounded-[2.5rem] text-white shadow-xl">
                <h3 className="font-black uppercase text-sm mb-4 flex items-center gap-2">
                    <i className="fas fa-shield-check text-blue-500"></i>
                    Security & Usage Notes
                </h3>
                <div className="grid md:grid-cols-2 gap-6 text-sm font-medium text-slate-300">
                    <div className="flex gap-3">
                        <i className="fas fa-check-circle text-green-500 mt-1"></i>
                        <div>
                            <p className="font-bold text-white mb-1">Permanent QR Codes</p>
                            <p className="text-xs">These codes never expire or change. Print once and use forever.</p>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <i className="fas fa-check-circle text-green-500 mt-1"></i>
                        <div>
                            <p className="font-bold text-white mb-1">Auto-Authentication</p>
                            <p className="text-xs">Users must be logged in to scan. Attendance is linked to their account.</p>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <i className="fas fa-check-circle text-green-500 mt-1"></i>
                        <div>
                            <p className="font-bold text-white mb-1">Staff Punch In/Out</p>
                            <p className="text-xs">Staff scan once to punch in, scan again to punch out same day.</p>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <i className="fas fa-check-circle text-green-500 mt-1"></i>
                        <div>
                            <p className="font-bold text-white mb-1">Member Access Control</p>
                            <p className="text-xs">Members need active gym subscription to check in via QR.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BranchQR;

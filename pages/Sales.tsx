
import React, { useState } from 'react';
import { useAppContext } from '../AppContext';
import { Sale } from '../types';
import InvoiceModal from '../components/InvoiceModal';

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
};

const Sales: React.FC = () => {
  const { fetchPaginatedSales, isFetchingSales, salesChangeTrigger, users, plans, branches, inventory, currentUser, generateTransactionCode, isRowVisible } = useAppContext();
  const [viewingSale, setViewingSale] = useState<Sale | null>(null);
  const [generatedPIN, setGeneratedPIN] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Pagination & Search state
  const [paginatedSales, setPaginatedSales] = useState<Sale[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [periodRevenue, setPeriodRevenue] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedBranchId, setSelectedBranchId] = useState<'all' | string>('all');
  const pageSize = 10;
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Sync selectedBranchId with user branch on mount/login
  React.useEffect(() => {
    if (currentUser) {
      if (currentUser.role === 'SUPER_ADMIN') {
        setSelectedBranchId('all');
      } else if (currentUser.branchId) {
        setSelectedBranchId(currentUser.branchId);
      }
    }
  }, [currentUser]);

  // Debounce search term
  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setCurrentPage(1);
    }, 500);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  // Fetch paginated data
  const loadSales = React.useCallback(async () => {
    const result = await fetchPaginatedSales({
      page: currentPage,
      pageSize,
      searchTerm: debouncedSearch,
      branchId: selectedBranchId
    });
    setPaginatedSales(result.sales);
    setTotalCount(result.totalCount);
    setPeriodRevenue(result.periodRevenue);
  }, [currentPage, debouncedSearch, selectedBranchId, salesChangeTrigger, fetchPaginatedSales]);

  React.useEffect(() => {
    loadSales();
  }, [loadSales, salesChangeTrigger]);

  const totalPages = Math.ceil(totalCount / pageSize);

  const closeInvoice = () => setViewingSale(null);

  const [selectedBranchForPIN, setSelectedBranchForPIN] = useState(currentUser?.branchId || branches[0]?.id || '');

  const handleGeneratePIN = async () => {
    setIsGenerating(true);
    const pin = await generateTransactionCode(selectedBranchForPIN);
    setGeneratedPIN(pin);
    setIsGenerating(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="w-full md:w-auto">
          <h2 className="text-3xl font-black text-slate-900 tracking-tight uppercase">Revenue Hub</h2>
          <p className="text-slate-500 font-medium">Real-time financial tracking across branches</p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full md:w-auto">
          {currentUser?.role === 'SUPER_ADMIN' && (
            <select
              className="p-3 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none shadow-sm"
              value={selectedBranchId}
              onChange={e => setSelectedBranchId(e.target.value)}
            >
              <option value="all">Global (All Branches)</option>
              {branches.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          )}
          <button
            onClick={handleGeneratePIN}
            disabled={isGenerating}
            className="bg-slate-900 text-white px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-slate-100 hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
          >
            {isGenerating ? <i className="fas fa-circle-notch fa-spin"></i> : <i className="fas fa-key"></i>}
            GENERATE PIN
          </button>
          <div className="bg-emerald-50 px-6 py-3 rounded-2xl border border-emerald-100 shadow-sm flex-1 sm:flex-none text-center sm:text-left">
            <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest leading-none mb-1">Period Revenue</p>
            <p className="text-xl font-black text-emerald-700">{formatCurrency(periodRevenue)}</p>
          </div>
        </div>
      </div>

      {generatedPIN && (
        <div className="bg-slate-900 p-8 rounded-[2.5rem] text-center text-white relative overflow-hidden animate-[slideUp_0.4s_ease-out] shadow-2xl border border-slate-800">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-transparent pointer-events-none"></div>
          <p className="text-slate-400 font-black text-[10px] uppercase tracking-[0.2em] mb-3">One-Time Transaction PIN</p>
          <div className="text-5xl md:text-6xl font-black tracking-[0.3em] font-mono text-white mb-4 bg-white/5 py-4 rounded-2xl border border-white/10 mx-auto max-w-sm">{generatedPIN}</div>
          <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest max-w-md mx-auto leading-relaxed">Share this code with staff to authorize a Cash/Card transaction. Valid for one use only.</p>
          <button onClick={() => setGeneratedPIN(null)} className="absolute top-6 right-6 w-8 h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors text-white"><i className="fas fa-times"></i></button>
        </div>
      )}

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm">
        <div className="relative">
          <i className="fas fa-search absolute left-5 top-1/2 -translate-y-1/2 text-slate-300"></i>
          <input
            type="text"
            placeholder="Search by Invoice No or Member Name..."
            className="w-full pl-12 pr-6 py-4 bg-slate-50 border-none rounded-2xl font-bold text-slate-900 placeholder:text-slate-300 outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Mobile Card View */}
      <div className="grid grid-cols-1 gap-4 md:hidden pb-10">
        {isFetchingSales ? (
          <div className="py-20 text-center space-y-4">
             <i className="fas fa-circle-notch fa-spin text-4xl text-blue-500"></i>
             <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Loading Revenue Data...</p>
          </div>
        ) : paginatedSales.length === 0 ? (
          <div className="bg-white p-10 rounded-3xl border border-slate-100 text-center text-slate-400 italic">No sales data recorded yet.</div>
        ) : (
          paginatedSales.map(sale => {
            const memberName = sale.member?.name || 'Unknown Member';
            const plan = plans.find(p => p.id === sale.planId);
            const inventoryItem = inventory.find(i => i.id === sale.itemId);
            const branch = branches.find(b => b.id === sale.branchId);
            const itemName = plan?.name || inventoryItem?.name || 'Unknown Item';
            return (
              <div key={sale.id} className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm space-y-4 hover:border-slate-300 transition-colors">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[9px] font-black text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full uppercase tracking-widest mb-2 block w-fit">#{sale.invoiceNo}</span>
                    <h3 className="font-black text-slate-900 leading-tight">{memberName}</h3>
                    <p className="text-[10px] text-slate-400 font-bold">{sale.date}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-black text-slate-900">{formatCurrency(sale.amount)}</p>
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{sale.paymentMethod}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                  <div className="min-w-0">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Purchased</p>
                    <p className="text-xs font-bold text-slate-700 truncate">{itemName}</p>
                    <p className="text-[9px] font-bold text-slate-400 uppercase">{branch?.name}</p>
                  </div>
                  <button
                    onClick={() => setViewingSale(sale)}
                    className="w-10 h-10 bg-slate-900 text-white rounded-xl flex items-center justify-center shadow-lg shadow-slate-100 active:scale-95 transition-all"
                  >
                    <i className="fas fa-file-invoice text-xs"></i>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50/50 border-b border-slate-100">
              <tr className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                <th className="px-8 py-5">Invoice No</th>
                <th className="px-8 py-5">Member</th>
                <th className="px-8 py-5">Plan / Service</th>
                <th className="px-8 py-5">Branch</th>
                <th className="px-8 py-5 text-right">Amount</th>
                <th className="px-8 py-5 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {isFetchingSales ? (
                <tr>
                   <td colSpan={6} className="px-8 py-20 text-center">
                      <div className="flex flex-col items-center gap-4">
                        <i className="fas fa-circle-notch fa-spin text-4xl text-blue-500"></i>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Synchronizing Ledger...</p>
                      </div>
                   </td>
                </tr>
              ) : paginatedSales.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-8 py-20 text-center text-slate-400 italic font-medium">No sales data recorded yet.</td>
                </tr>
              ) : (
                paginatedSales.map(sale => {
                  const memberName = sale.member?.name || 'Unknown Member';
                  const plan = plans.find(p => p.id === sale.planId);
                  const inventoryItem = inventory.find(i => i.id === sale.itemId);
                  const branch = branches.find(b => b.id === sale.branchId);
                  const itemName = plan?.name || inventoryItem?.name || 'Unknown Item';
                  return (
                    <tr key={sale.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-8 py-6">
                        <span className="font-mono text-[10px] text-blue-600 font-black bg-blue-50 px-2 py-1 rounded-lg">#{sale.invoiceNo}</span>
                      </td>
                      <td className="px-8 py-6">
                        <div className="font-black text-slate-900 text-sm">{memberName}</div>
                        <div className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">{sale.date}</div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="text-xs font-black text-slate-700 uppercase tracking-tight mb-1">{itemName}</div>
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] bg-slate-100 text-slate-500 font-black px-2 py-0.5 rounded-full uppercase tracking-widest">{sale.paymentMethod}</span>
                          {sale.transactionCode && <span className="text-[9px] text-slate-400 font-mono">CODE: {sale.transactionCode}</span>}
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest bg-slate-100 px-2 py-1 rounded">
                          {branch?.name}
                        </span>
                      </td>
                      <td className="px-8 py-6 text-right">
                        <span className="font-black text-slate-900 text-sm">{formatCurrency(sale.amount)}</span>
                      </td>
                      <td className="px-8 py-6 text-center">
                        <button
                          onClick={() => setViewingSale(sale)}
                          className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-slate-900 hover:bg-white hover:shadow-lg rounded-xl transition-all"
                          title="View Invoice"
                        >
                          <i className="fas fa-file-invoice"></i>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm mb-10">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
            Showing Page {currentPage} of {totalPages} ({totalCount} Sales)
          </p>
          <div className="flex items-center gap-2">
            <button
              disabled={currentPage === 1 || isFetchingSales}
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              className="px-6 py-3 bg-slate-50 text-slate-900 rounded-xl font-black text-[10px] uppercase tracking-widest disabled:opacity-50 hover:bg-slate-100 transition-all active:scale-95"
            >
              Previous
            </button>
            <button
              disabled={currentPage === totalPages || isFetchingSales}
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              className="px-6 py-3 bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase tracking-widest disabled:opacity-50 shadow-xl shadow-slate-100 hover:bg-slate-800 transition-all active:scale-95"
            >
              Next Page
            </button>
          </div>
        </div>
      )}

      {viewingSale && (
        <InvoiceModal
          sale={viewingSale}
          branch={branches.find(b => b.id === viewingSale.branchId)!}
          member={viewingSale.member as any || { name: 'Unknown Member' }}
          item={(plans.find(p => p.id === viewingSale.planId) || inventory.find(i => i.id === viewingSale.itemId))!}
          onClose={closeInvoice}
        />
      )}
    </div>
  );
};

export default Sales;


import React, { useState, useEffect, useMemo } from 'react';
import { useAppContext } from '../AppContext';
import { InventoryItem, UserRole, User } from '../types';
import PaymentModal from '../components/PaymentModal';

const Inventory: React.FC = () => {
  const { inventory, branches, addInventory, updateInventory, deleteInventory, sellInventoryItem, users, currentUser, isRowVisible, fetchPaginatedMembers, selectedBranchId } = useAppContext();
  const [deleteConfirm, setDeleteConfirm] = useState<InventoryItem | null>(null);
  const [isModalOpen, setModalOpen] = useState(false);
  const [isSellModalOpen, setSellModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    category: 'SUPPLEMENT' as const,
    price: 0,
    stock: 0,
    branchId: currentUser?.branchId || branches[0]?.id || ''
  });

  const [sellData, setSellData] = useState({
    memberId: '',
    quantity: 1,
    paymentMethod: 'CASH' as 'CASH' | 'POS' | 'CARD' | 'ONLINE',
    transactionCode: ''
  });
  const [members, setMembers] = useState<User[]>([]);
  const [memberSearch, setMemberSearch] = useState('');
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);

  // Fetch members specifically for POS dropdown (Debounced Search)
  useEffect(() => {
    if (!isSellModalOpen) return;

    const timer = setTimeout(async () => {
      setIsLoadingMembers(true);
      try {
        const { members: memberList } = await fetchPaginatedMembers({
          page: 1,
          pageSize: 100, // Reasonable limit for search results
          searchTerm: memberSearch,
          branchId: selectedBranchId
        });
        setMembers(memberList);
      } catch (err) {
        console.error('Error fetching members for POS:', err);
      } finally {
        setIsLoadingMembers(false);
      }
    }, 400); // 400ms debounce

    return () => clearTimeout(timer);
  }, [isSellModalOpen, memberSearch, fetchPaginatedMembers, selectedBranchId]);

  const [isPaymentModalOpen, setPaymentModalOpen] = useState(false);

  const filteredInventory = inventory.filter(i => isRowVisible(i.branchId));

  const handleOpenAdd = () => {
    setSelectedItem(null);
    setFormData({ name: '', category: 'SUPPLEMENT', price: 0, stock: 0, branchId: currentUser?.branchId || branches[0]?.id || '' });
    setModalOpen(true);
  };

  const handleOpenEdit = (item: InventoryItem) => {
    setSelectedItem(item);
    setFormData({ name: item.name, category: item.category as any, price: item.price, stock: item.stock, branchId: item.branchId });
    setModalOpen(true);
  };

  const handleOpenSell = (item: InventoryItem) => {
    setSelectedItem(item);
    setSellData({ memberId: '', quantity: 1, paymentMethod: 'CASH', transactionCode: '' });
    setSellModalOpen(true);
  };

  const handleDelete = async () => {
    if (deleteConfirm) {
      await deleteInventory(deleteConfirm.id);
      setDeleteConfirm(null);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedItem) {
      updateInventory(selectedItem.id, formData);
    } else {
      addInventory({ id: `inv-${Date.now()}`, ...formData });
    }
    setModalOpen(false);
  };

  const handleSell = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedItem) {
      // For Card/Online payments, open Razorpay modal
      if (sellData.paymentMethod === 'CARD' || sellData.paymentMethod === 'ONLINE') {
        setPaymentModalOpen(true);
      } else {
        // For Cash/POS, proceed with transaction code
        sellInventoryItem(
          selectedItem.id,
          sellData.memberId,
          sellData.quantity,
          sellData.paymentMethod,
          sellData.transactionCode,
          undefined
        );
        setSellModalOpen(false);
      }
    }
  };

  const handlePaymentSuccess = (paymentId: string) => {
    if (selectedItem) {
      sellInventoryItem(
        selectedItem.id,
        sellData.memberId,
        sellData.quantity,
        sellData.paymentMethod,
        undefined,
        paymentId
      );
      setSellModalOpen(false);
      setPaymentModalOpen(false);
    }
  };

  const formatCurrency = (amt: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amt);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Inventory & POS</h2>
          <p className="text-slate-500 font-medium text-sm">Retail management and stock replenishment</p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="w-full md:w-auto bg-blue-600 text-white px-8 py-3 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-100 flex items-center justify-center gap-2 active:scale-95"
        >
          <i className="fas fa-plus"></i> ADD NEW ITEM
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {filteredInventory.map(item => (
          <div key={item.id} className="bg-white p-6 rounded-[2rem] border shadow-sm relative overflow-hidden group">
            <div className={`absolute top-0 right-0 w-2 h-full ${item.stock < 5 ? 'bg-red-500' : 'bg-green-500'}`}></div>
            <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-2">{item.category}</p>
            <h3 className="text-lg font-black text-slate-900 mb-1 truncate">{item.name}</h3>
            <p className="text-2xl font-black text-slate-900 mb-4">{formatCurrency(item.price)}</p>

            <div className="flex justify-between items-center border-t pt-4">
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase">In Stock</p>
                <p className={`font-black ${item.stock < 5 ? 'text-red-600' : 'text-slate-900'}`}>{item.stock} Units</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleOpenEdit(item)}
                  className="bg-blue-50 text-blue-500 w-10 h-10 rounded-xl flex items-center justify-center hover:bg-blue-100 hover:scale-110 transition-all"
                  title="Edit Item"
                >
                  <i className="fas fa-pen"></i>
                </button>
                <button
                  onClick={() => setDeleteConfirm(item)}
                  className="bg-red-50 text-red-500 w-10 h-10 rounded-xl flex items-center justify-center hover:bg-red-100 hover:scale-110 transition-all"
                  title="Delete Item"
                >
                  <i className="fas fa-trash-alt"></i>
                </button>
                <button
                  onClick={() => handleOpenSell(item)}
                  className="bg-slate-900 text-white w-10 h-10 rounded-xl flex items-center justify-center hover:scale-110 transition-transform"
                >
                  <i className="fas fa-shopping-basket"></i>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md p-8 shadow-2xl animate-[slideUp_0.3s_ease-out] max-h-[90dvh] overflow-y-auto">
            <h3 className="text-2xl font-bold mb-6">{selectedItem ? 'Edit Item' : 'Add New Item'}</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <label htmlFor="inv-name" className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Item Name</label>
                <input required id="inv-name" name="name" placeholder="Item Name" className="w-full p-3 bg-gray-50 border rounded-xl outline-none" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
              </div>
              <div className="space-y-1">
                <label htmlFor="inv-category" className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Category</label>
                <select id="inv-category" name="category" className="w-full p-3 bg-gray-50 border rounded-xl outline-none" value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value as any })}>
                  <option value="SUPPLEMENT">Supplement</option>
                  <option value="GEAR">Gear</option>
                  <option value="BEVERAGE">Beverage</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label htmlFor="inv-price" className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Price (₹)</label>
                  <input id="inv-price" name="price" type="number" placeholder="Price" className="w-full p-3 bg-gray-50 border rounded-xl" value={formData.price || ''} onChange={e => setFormData({ ...formData, price: Number(e.target.value) })} />
                </div>
                <div className="space-y-1">
                  <label htmlFor="inv-stock" className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Initial Stock</label>
                  <input id="inv-stock" name="stock" type="number" placeholder="Stock" className="w-full p-3 bg-gray-50 border rounded-xl" value={formData.stock || ''} onChange={e => setFormData({ ...formData, stock: Number(e.target.value) })} />
                </div>
              </div>
              <div className="space-y-1">
                <label htmlFor="inv-branch" className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Home Branch</label>
                <select
                  id="inv-branch"
                  name="branchId"
                  className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl outline-none font-bold text-xs uppercase tracking-widest"
                  value={formData.branchId}
                  onChange={e => setFormData({ ...formData, branchId: e.target.value })}
                  disabled={currentUser?.role !== UserRole.SUPER_ADMIN}
                >
                  {branches.filter(b => currentUser?.role === UserRole.SUPER_ADMIN || b.id === currentUser?.branchId).map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>
              <button className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold">{selectedItem ? 'UPDATE ITEM' : 'SAVE ITEM'}</button>
              <button type="button" onClick={() => setModalOpen(false)} className="w-full py-2 text-gray-400">CANCEL</button>
            </form>
          </div>
        </div>
      )}

      {isSellModalOpen && selectedItem && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md p-8 shadow-2xl animate-[slideUp_0.3s_ease-out] max-h-[90dvh] overflow-y-auto">
            <h3 className="text-2xl font-bold mb-2 uppercase tracking-tight">Point of Sale</h3>
            <p className="text-slate-400 text-sm mb-6">Selling: {selectedItem.name}</p>
            <form onSubmit={handleSell} className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Member (Bill To)</label>
                <div className="space-y-2">
                  <div className="relative">
                    <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 text-xs"></i>
                    <input
                      type="text"
                      placeholder="Search member name or ID..."
                      className="w-full p-2 pl-9 bg-slate-50 border rounded-xl text-xs outline-none focus:ring-1 focus:ring-blue-500"
                      value={memberSearch}
                      onChange={e => setMemberSearch(e.target.value)}
                    />
                  </div>
                  <select 
                    id="sell-member" 
                    name="memberId" 
                    required 
                    className="w-full p-3 bg-gray-50 border rounded-xl text-sm" 
                    value={sellData.memberId} 
                    onChange={e => setSellData({ ...sellData, memberId: e.target.value })}
                  >
                    {isLoadingMembers ? (
                      <option value="">Searching...</option>
                    ) : (
                      <>
                        <option value="">{members.length === 0 ? 'No members found' : 'Select Member...'}</option>
                        {members.map(m => (
                          <option key={m.id} value={m.id}>
                            {m.name} {m.memberId ? `(${m.memberId})` : ''}
                          </option>
                        ))}
                      </>
                    )}
                  </select>
                  {members.length === 0 && !isLoadingMembers && memberSearch && (
                    <p className="text-[10px] text-amber-600 font-bold ml-1">
                      <i className="fas fa-search-minus mr-1"></i> No matches for "{memberSearch}"
                    </p>
                  )}
                </div>
              </div>
              <div>
                <label htmlFor="sell-quantity" className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Quantity</label>
                <input id="sell-quantity" name="quantity" type="number" min="1" max={selectedItem.stock} className="w-full p-3 bg-gray-50 border rounded-xl" value={sellData.quantity} onChange={e => setSellData({ ...sellData, quantity: Number(e.target.value) })} />
              </div>
              <div>
                <label htmlFor="sell-payment" className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Payment Method</label>
                <select id="sell-payment" name="paymentMethod" required className="w-full p-3 bg-gray-50 border rounded-xl" value={sellData.paymentMethod} onChange={e => setSellData({ ...sellData, paymentMethod: e.target.value as any, transactionCode: '' })}>
                  <option value="CASH">Cash</option>
                  <option value="POS">POS</option>
                  <option value="CARD">Card (Razorpay)</option>
                  <option value="ONLINE">Online (Razorpay)</option>
                </select>
              </div>
              {(sellData.paymentMethod === 'CASH' || sellData.paymentMethod === 'POS') && (
                <div>
                  <label htmlFor="sell-pin" className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Transaction Code</label>
                  <input
                    id="sell-pin"
                    name="transactionCode"
                    type="text"
                    required
                    placeholder="Enter PIN from Sales page"
                    className="w-full p-3 bg-gray-50 border rounded-xl font-mono tracking-widest"
                    value={sellData.transactionCode}
                    onChange={e => setSellData({ ...sellData, transactionCode: e.target.value })}
                  />
                </div>
              )}
              {(sellData.paymentMethod === 'CARD' || sellData.paymentMethod === 'ONLINE') && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                  <div className="flex items-center gap-2 text-blue-700 mb-2">
                    <i className="fas fa-info-circle"></i>
                    <span className="text-xs font-bold">Razorpay Payment</span>
                  </div>
                  <p className="text-[10px] text-blue-600">
                    Click "CONFIRM SALE" to proceed with secure Razorpay payment.
                  </p>
                </div>
              )}
              <div className="p-4 bg-slate-50 rounded-2xl flex justify-between items-center font-black">
                <span className="text-slate-500 text-xs">TOTAL</span>
                <span className="text-xl">{formatCurrency(selectedItem.price * sellData.quantity)}</span>
              </div>
              <button className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold shadow-xl shadow-slate-200">CONFIRM SALE</button>
              <button type="button" onClick={() => setSellModalOpen(false)} className="w-full py-2 text-gray-400">CANCEL</button>
            </form>
          </div>
        </div>
      )}

      {/* Razorpay Payment Modal */}
      {isPaymentModalOpen && selectedItem && (
        <PaymentModal
          isOpen={isPaymentModalOpen}
          onClose={() => setPaymentModalOpen(false)}
          amount={selectedItem.price * sellData.quantity}
          description={`Purchase: ${selectedItem.name} x ${sellData.quantity}`}
          customerName={members.find(u => u.id === sellData.memberId)?.name}
          customerEmail={members.find(u => u.id === sellData.memberId)?.email}
          customerPhone={members.find(u => u.id === sellData.memberId)?.phone}
          branchId={selectedItem.branchId}
          onSuccess={handlePaymentSuccess}
          onError={(err) => {
            console.error('Payment failed:', err);
            setPaymentModalOpen(false);
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm p-8 shadow-2xl animate-[slideUp_0.3s_ease-out] text-center max-h-[90dvh] overflow-y-auto">
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <i className="fas fa-trash-alt text-2xl text-red-500"></i>
            </div>
            <h3 className="text-xl font-black text-slate-900 mb-2 uppercase">Delete Item</h3>
            <p className="text-slate-500 text-sm mb-6">
              Are you sure you want to delete <span className="font-bold text-slate-900">{deleteConfirm.name}</span>? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-all"
              >
                CANCEL
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-all"
              >
                DELETE
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Inventory;

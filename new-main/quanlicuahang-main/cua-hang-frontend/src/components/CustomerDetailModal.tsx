import React from 'react';

// Interface kiểu dữ liệu Khách hàng
export interface Customer {
  id: number;
  fullName: string;
  phone?: string | null;
  address?: string | null;
  vehicleName?: string | null;
  color?: string | null;
  price?: number | null;
  prepaidAmount?: number | null;
  prepaid_amount?: number | null;
  so_tien_tra_truoc?: number | null;
  debtAmount?: number | null;
  installmentBank?: string | null;
  staffName?: string | null;
  branchName?: string | null;
  frameNumber?: string | null;
  batteryNumber?: string | null;
  email?: string | null;
  idCardNumber?: string | null;
  idCardIssueDate?: string | null;
  formTimestamp?: string | null;
  note?: string | null;
  promotion?: string | null;            // ⚡ Trường mới
  uudai_quatang?: string | null;        // ⚡ Fallback key
  ['Ưu đãi/Quà tặng']?: string | null;  // ⚡ Fallback key từ Google Sheet
  imageUrl?: string | null;
}

interface CustomerDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer | null;
}

export const CustomerDetailModal: React.FC<CustomerDetailModalProps> = ({
  isOpen,
  onClose,
  customer,
}) => {
  if (!isOpen || !customer) return null;

  // 1. Format tiền tệ VNĐ
  const formatMoney = (amount?: number | null) => {
    if (amount === undefined || amount === null || isNaN(amount)) return '0 VNĐ';
    return `${amount.toLocaleString('vi-VN')} VNĐ`;
  };

  // 2. Tự động lấy Số tiền trả trước từ mọi biến có thể có
  const actualPrepaid =
    customer.prepaidAmount ?? customer.prepaid_amount ?? customer.so_tien_tra_truoc ?? 0;

  // 3. Tự động lấy Ưu đãi / Quà tặng
  const actualPromotion =
    customer.promotion ||
    customer.uudai_quatang ||
    customer['Ưu đãi/Quà tặng'] ||
    null;

  // 4. Hàm làm sạch Tên Xe (Loại bỏ Email / Tên Ngân hàng dính vào tên xe)
  const getCleanVehicleName = (rawName?: string | null) => {
    if (!rawName) return '---';
    let cleaned = rawName;
    
    // Loại bỏ Email nếu dính vào tên xe
    if (customer.email && cleaned.includes(customer.email)) {
      cleaned = cleaned.replace(customer.email, '');
    }
    // Loại bỏ Tên ngân hàng nếu dính ở cuối tên xe
    if (customer.installmentBank && cleaned.endsWith(customer.installmentBank)) {
      cleaned = cleaned.slice(0, -customer.installmentBank.length);
    }
    
    return cleaned.trim() || '---';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl bg-white rounded-xl shadow-2xl overflow-hidden border border-gray-100 animate-in fade-in zoom-in duration-200">
        
        {/* Header Modal */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="text-xl font-bold text-gray-800">
            Thông Tin Chi Tiết Khách Hàng #{customer.id}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors text-2xl font-light focus:outline-none"
          >
            &times;
          </button>
        </div>

        {/* Nội dung chi tiết */}
        <div className="p-6 space-y-4 text-sm text-gray-700 max-h-[80vh] overflow-y-auto">
          
          {/* Hàng 1: Họ tên & CCCD */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-gray-500">Họ và Tên:</span>
              <p className="font-bold text-blue-600 text-base">{customer.fullName || '---'}</p>
            </div>
            <div>
              <span className="text-gray-500">CCCD / CMND:</span>
              <p className="font-medium">{customer.idCardNumber || '---'}</p>
            </div>
          </div>

          {/* Hàng 2: SĐT & Email */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-gray-500">Số Điện Thoại:</span>
              <p className="font-medium">{customer.phone || '---'}</p>
            </div>
            <div>
              <span className="text-gray-500">Email:</span>
              <p className="font-medium">{customer.email || '---'}</p>
            </div>
          </div>

          {/* Hàng 3: Địa chỉ */}
          <div>
            <span className="text-gray-500">Địa Chỉ:</span>
            <p className="font-medium">{customer.address || '---'}</p>
          </div>

          {/* Hàng 4: Tên Xe */}
          <div>
            <span className="text-gray-500">Tên Xe / Hãng:</span>
            <p className="font-bold text-gray-900 text-base">
              {getCleanVehicleName(customer.vehicleName)}
            </p>
          </div>

          {/* Hàng 5: Màu xe & Thời gian mua */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-gray-500">Màu Xe:</span>
              <p className="mt-1">
                <span className="inline-block bg-blue-50 text-blue-600 px-3 py-1 rounded-md text-xs font-semibold">
                  {customer.color || '---'}
                </span>
              </p>
            </div>
            <div>
              <span className="text-gray-500">Thời Gian Mua:</span>
              <p className="font-medium mt-1">{customer.formTimestamp || '---'}</p>
            </div>
          </div>

          {/* Hàng 6: Số khung & Số Máy / Acquy */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-gray-500">Số Khung (VIN):</span>
              <p className="mt-1">
                <span className="bg-orange-50 text-orange-600 px-2 py-1 rounded text-xs font-mono font-medium border border-orange-200">
                  {customer.frameNumber || '---'}
                </span>
              </p>
            </div>
            <div>
              <span className="text-gray-500">Số Máy / Acquy:</span>
              <p className="mt-1">
                <span className="bg-green-50 text-green-600 px-2 py-1 rounded text-xs font-mono font-medium border border-green-200">
                  {customer.batteryNumber || '---'}
                </span>
              </p>
            </div>
          </div>

          {/* Hàng 7: Giá bán & Số tiền trả trước */}
          <div className="grid grid-cols-2 gap-4 pt-2">
            <div>
              <span className="text-gray-500">Giá Bán:</span>
              <p className="font-bold text-red-600 text-base">{formatMoney(customer.price)}</p>
            </div>
            <div>
              <span className="text-gray-500">Số Tiền Trả Trước:</span>
              <p className="font-bold text-teal-600 text-base">{formatMoney(actualPrepaid)}</p>
            </div>
          </div>

          {/* Hàng 8: Số tiền còn nợ & Ngân hàng góp */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-gray-500">Số Tiền Còn Nợ:</span>
              <p className="font-bold text-red-600">{formatMoney(customer.debtAmount)}</p>
            </div>
            <div>
              <span className="text-gray-500">Ngân Hàng Góp:</span>
              <p className="font-medium">{customer.installmentBank || '---'}</p>
            </div>
          </div>

          {/* Hàng 9: Nhân viên & Chi nhánh */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-gray-500">Nhân Viên:</span>
              <p className="font-medium">{customer.staffName || '---'}</p>
            </div>
            <div>
              <span className="text-gray-500">Chi Nhánh Mua:</span>
              <p className="mt-1">
                <span className="bg-blue-50 text-blue-600 px-3 py-1 rounded-md text-xs font-medium">
                  {customer.branchName || 'Chi nhánh 1'}
                </span>
              </p>
            </div>
          </div>

          <hr className="my-3 border-gray-200" />

          {/* Hàng 10: Ưu đãi / Quà tặng */}
          <div>
            <span className="text-gray-500 block mb-1 font-medium">Ưu Đãi / Quà Tặng:</span>
            <p className="italic text-amber-800 bg-amber-50 p-3 rounded-lg border border-amber-200 break-words font-medium">
              {actualPromotion || 'Không có ưu đãi/quà tặng'}
            </p>
          </div>

          {/* Hàng 11: Ghi chú */}
          <div>
            <span className="text-gray-500 block mb-1">Ghi Chú:</span>
            <p className="italic text-gray-600 bg-gray-50 p-3 rounded-lg border border-gray-100 break-words">
              {customer.note || 'Không có ghi chú'}
            </p>
          </div>

        </div>

        {/* Footer Modal */}
        <div className="flex justify-end px-6 py-4 bg-gray-50 border-t border-gray-100">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow-sm transition-colors"
          >
            Đóng
          </button>
        </div>

      </div>
    </div>
  );
};

export default CustomerDetailModal;
import { useState, useEffect, useMemo, type ChangeEvent } from 'react';
import { CustomerDetailModal } from './components/CustomerDetailModal';
import axios from 'axios';
import * as XLSX from 'xlsx';
import {
  Table,
  Input,
  Button,
  Card,
  Tag,
  Typography,
  Modal,
  Form,
  InputNumber,
  message,
  Popconfirm,
  Space,
  DatePicker,
  Select,
  Radio,
  Tabs,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  SearchOutlined,
  ReloadOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  FileExcelOutlined,
  FilterOutlined,
  PrinterOutlined,
  ShopOutlined,
  LockOutlined,
  UserOutlined,
  LogoutOutlined,
  KeyOutlined,
  SafetyCertificateOutlined,
  OrderedListOutlined,
  BarChartOutlined,
  InboxOutlined,
  HistoryOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import { supabase } from './supabase';
import { SalesAnalytics } from './components/SalesAnalytics';
import { InventoryManagement } from './components/InventoryManagement';
import { ActivityLogView } from './components/ActivityLogView';
import { logActivity } from './utils/logger';

dayjs.extend(customParseFormat);

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

const BASE_API_URL = import.meta.env.VITE_API_URL || `${window.location.origin}/api`;

export interface Customer {
  id?: number;
  fullName?: string;
  ho_ten?: string;
  phone?: string;
  dien_thoai?: string;
  address?: string;
  dia_chi?: string;
  brand?: string;
  model?: string;
  vehicleName?: string;
  color?: string;
  mau?: string;
  price?: number | string;
  gia_xe?: number | string;
  staffName?: string;
  nhan_vien?: string;
  branchName?: string;
  chi_nhanh?: string;
  frameNumber?: string;
  so_khung?: string;
  batteryNumber?: string;
  so_pin?: string;
  imageUrl?: string;
  formTimestamp?: string;
  timestamp?: string;
  ngay_mua?: string;
  createdAt?: string;

  // Các thuộc tính tài chính & thông tin cá nhân
  installmentBank?: string;
  debtAmount?: number | string;
  
  // ⚡ 2 TRƯỜNG MỚI BỔ SUNG:
  prepaidAmount?: number | string;
  promotion?: string; // Số tiền trả trước (so_tien_tra_truoc)
  note?: string;                  // Ghi chú (ghi_chu)

  email?: string;
  idCardNumber?: string;
  idCardIssueDate?: string;
  [key: string]: any;
}

export interface SystemAccount {
  username: string;
  password: string;
  fullName: string;
  branch: string;
  role: 'admin' | 'staff';
}

const DEFAULT_FIXED_ACCOUNTS: SystemAccount[] = [
  { username: 'admin', password: '123456', fullName: 'Ban Quản Trị (Admin)', branch: 'Chi nhánh 1', role: 'admin' },
  { username: 'chinhanh1', password: '123456', fullName: 'Chi nhánh 1', branch: 'Chi nhánh 1', role: 'staff' },
  { username: 'chinhanh2', password: '123456', fullName: 'Chi nhánh 2', branch: 'Chi nhánh 2', role: 'staff' },
];

export const extractVehicleInfo = (item: Customer) => {
  if (item.vehicleName && item.vehicleName.trim() && item.vehicleName.trim() !== '---') {
    return item.vehicleName.trim();
  }

  const excludedKeys = [
    'id', 'fullname', 'ho_ten', 'phone', 'dien_thoai', 'address', 'dia_chi',
    'color', 'mau', 'price', 'gia_xe', 'staffname', 'nhan_vien', 'branchname',
    'chi_nhanh', 'framenumber', 'so_khung', 'batterynumber', 'so_pin', 'imageurl',
    'formtimestamp', 'timestamp', 'ngay_mua', 'created_at', 'createdat', 'dấu thời gian',
    'installmentbank', 'debtamount', 'prepaidamount', 'so_tien_tra_truoc', 'note', 'ghi_chu',
    'email', 'idcardnumber', 'idcardissuedate'
  ];

  const foundText: string[] = [];

  Object.keys(item).forEach((key) => {
    const lowerKey = key.toLowerCase().trim();
    if (excludedKeys.some((ex) => lowerKey.includes(ex))) return;

    const val = item[key];
    if (typeof val === 'string') {
      const clean = val.trim();
      if (
        clean &&
        clean !== '---' &&
        clean !== 'SUCCESS' &&
        !clean.startsWith('http') &&
        isNaN(Number(clean)) &&
        !foundText.includes(clean)
      ) {
        foundText.push(clean);
      }
    }
  });

  return foundText.length > 0 ? foundText.join(' ') : '---';
};

export const parseDateDetails = (customerData: any) => {
  if (!customerData) {
    const now = new Date();
    return {
      day: String(now.getDate()).padStart(2, '0'),
      month: String(now.getMonth() + 1).padStart(2, '0'),
      year: String(now.getFullYear()),
      fullDate: `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`,
      dayjsObj: dayjs(),
    };
  }

  const rawDateStr =
    (typeof customerData === 'string' ? customerData : null) ||
    customerData.formTimestamp ||
    customerData.timestamp ||
    customerData.ngay_mua ||
    customerData.created_at ||
    customerData.createdAt ||
    '';

  if (rawDateStr.includes('/')) {
    const cleanDate = rawDateStr.split(' ')[0].trim();
    const parts = cleanDate.split('/');
    if (parts.length >= 3) {
      const d = parts[0].padStart(2, '0');
      const m = parts[1].padStart(2, '0');
      const y = parts[2].length === 2 ? `20${parts[2]}` : parts[2];
      return { day: d, month: m, year: y, fullDate: `${d}/${m}/${y}`, dayjsObj: dayjs(`${y}-${m}-${d}`) };
    }
  }

  if (rawDateStr.includes('-')) {
    const cleanDate = rawDateStr.split('T')[0].split(' ')[0].trim();
    const parts = cleanDate.split('-');
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        return {
          day: parts[2].padStart(2, '0'),
          month: parts[1].padStart(2, '0'),
          year: parts[0],
          fullDate: `${parts[2].padStart(2, '0')}/${parts[1].padStart(2, '0')}/${parts[0]}`,
          dayjsObj: dayjs(`${parts[0]}-${parts[1]}-${parts[2]}`),
        };
      }
      return {
        day: parts[0].padStart(2, '0'),
        month: parts[1].padStart(2, '0'),
        year: parts[2],
        fullDate: `${parts[0].padStart(2, '0')}/${parts[1].padStart(2, '0')}/${parts[2]}`,
        dayjsObj: dayjs(`${parts[2]}-${parts[1]}-${parts[0]}`),
      };
    }
  }

  const dateObj = new Date(rawDateStr);
  if (!isNaN(dateObj.getTime())) {
    const d = String(dateObj.getDate()).padStart(2, '0');
    const m = String(dateObj.getMonth() + 1).padStart(2, '0');
    const y = String(dateObj.getFullYear());
    return { day: d, month: m, year: y, fullDate: `${d}/${m}/${y}`, dayjsObj: dayjs(dateObj) };
  }

  return { day: '....', month: '....', year: '2026', fullDate: '---', dayjsObj: null };
};

const executePrintContract = (customer: Customer) => {
  const { day, month, year } = parseDateDetails(customer);

  const hoTen = customer.fullName || customer.ho_ten || '';
  const dienThoai = customer.phone || customer.dien_thoai || '';
  const diaChi = customer.address || customer.dia_chi || '';
  const email = customer.email || '';
  const idCardNumber = customer.idCardNumber || '';
  const idCardIssueDate = customer.idCardIssueDate || '';
  const installmentBank = customer.installmentBank || '';
  const debtAmountNum = Number(customer.debtAmount || 0);
  const debtAmountStr = debtAmountNum > 0 ? debtAmountNum.toLocaleString('vi-VN') + ' VNĐ' : '';

 
  

  const modelXe = extractVehicleInfo(customer);
  const mauXe = customer.color || customer.mau || '';
  const soKhung = customer.frameNumber || customer.so_khung || '';
  const customerNote = customer.note ? customer.note.trim() : '';

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Vui lòng cho phép mở popup trên trình duyệt để in hợp đồng!');
    return;
  }

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="vi">
    <head>
      <meta charset="utf-8">
      <title>Hop_dong_${hoTen || 'khach_hang'}</title>
      <style>
        @page { 
          size: A4 portrait; 
          margin: 0; 
        }
        * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        
        html, body { 
          margin: 0; 
          padding: 0; 
          font-size: 11px; /* Giảm cỡ chữ chung xuống 12px */
          line-height: 1.15;
          background: #fff; 
          font-family: "Times New Roman", Times, serif; 
          color: #000; 
        }

        .page {
          width: 210mm;
          height: 297mm;
          padding: 8mm 12mm 8mm 12mm;
          position: relative;
          overflow: hidden;
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
        }

        .page-break {
          page-break-before: always;
        }

        table { width: 100%; border-collapse: collapse; }
        
        table.grid-table { border: 1px solid #000; margin-top: 10px; }
        table.grid-table td, table.grid-table th { 
          border: 1px solid #000; 
          padding: 8px 10px; 
          vertical-align: top; 
          font-size: 11pt;
          line-height: 1.35;
        }

        .bold { font-weight: bold; }
        .italic { font-style: italic; }
        .text-center { text-align: center; }
        .text-right { text-align: right; }
        
        .info-section {
          font-size: 11pt;
          line-height: 1.45;
        }

        .info-row { 
          margin-bottom: 3px; 
        }

        ul.note-list { margin: 4px 0; padding-left: 16px; font-size: 10pt; line-height: 1.25; }
        ul.note-list li { margin-bottom: 3px; }
      </style>
    </head>
    <body>
      <!-- TRANG 1 -->
      <div class="page" style="justify-content: space-between;">
        <div>
          <!-- HEADER CÔNG TY & QUỐC HIỆU -->
          <table style="margin-bottom: 12px;">
            <tbody>
              <tr>
                <td style="width: 56%; vertical-align: top;">
                  <strong style="font-size: 11.5pt;">CÔNG TY TNHH XE MÁY TÙNG PHƯỢNG</strong><br />
                  <span style="font-size: 9.5pt; line-height: 1.25;">
                    <strong>Chi Nhánh 1:</strong><br />
                    102 Ấp Nội Ô, Xã Giồng Riềng, Tỉnh Kiên Giang (0866.97.98.41)<br />
                    <strong>Chi Nhánh 2:</strong><br />
                    41 Hùng Vương, Ấp 6, Xã Giồng Riềng, Tỉnh Kiên Giang (0976.820.941)
                  </span>
                </td>
                <td style="width: 44%; vertical-align: top; text-align: center;">
                  <strong style="font-size: 10pt;">CỘNG HOÀ XÃ HỘI CHỦ NGHĨA VIỆT NAM</strong><br />
                  <strong style="font-size: 9pt;">Độc lập - Tự do - Hạnh phúc</strong><br />
                  <i style="font-size: 9.5pt;">An Giang, Ngày ${day} Tháng ${month} Năm 20${year.slice(-2)}</i>
                </td>
              </tr>
            </tbody>
          </table>

          <!-- TIÊU ĐỀ -->
          <div class="text-center" style="margin: 12px 0 14px 0;">
            <div class="bold" style="font-size: 16pt; letter-spacing: 0.5px;">BIÊN NHẬN</div>
            <div class="bold" style="font-size: 12pt;">(KIÊM HỢP ĐỒNG BÁN XE)</div>
          </div>

          <!-- THÔNG TIN BÊN A & BÊN B -->
          <div class="info-section">
            <div class="info-row"><strong>I. Bên A ( Bên bán xe): CÔNG TY TNHH XE MÁY TÙNG PHƯỢNG</strong></div>
            <div class="info-row" style="font-size: 9.5pt; margin-left: 12px;">
              <strong>Địa Chỉ:</strong><br />
              CN1: 102 Ấp Nội Ô, Xã Giồng Riềng, Tỉnh Kiên Giang (0866.97.98.41)<br />
              CN2: 41 Hùng Vương, Ấp 6, Xã Giồng Riềng, Tỉnh Kiên Giang (0976.820.941)
            </div>

            <div class="info-row" style="margin-top: 10px;"><strong>II. Bên B ( Bên mua xe):</strong></div>
            <div class="info-row">Họ và tên: <strong>${hoTen || '...................................................'}</strong> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Điện thoại: <strong>${dienThoai || '.........................'}</strong></div>
            <div class="info-row">Địa chỉ: <strong>${diaChi || '........................................................................................................................'}</strong></div>
            <div class="info-row">CCCD số: <strong>${idCardNumber || '............................................'}</strong> &nbsp;&nbsp;&nbsp;&nbsp; Ngày cấp: <strong>${idCardIssueDate || '.........................'}</strong> &nbsp;&nbsp;&nbsp;&nbsp; Nơi cấp: Cục Cảnh Sát.</div>
            <div class="info-row">Email: <strong>${email || '........................................................................................................................'}</strong></div>
            <div class="info-row">
              Tên Xe: <strong>${modelXe}</strong> &nbsp;&nbsp;&nbsp;&nbsp; Màu: <strong>${mauXe}</strong> &nbsp;&nbsp;&nbsp;&nbsp; Số VIN: <strong>${soKhung}</strong>
            </div>
            <div class="info-row">
              Ngân Hàng Vay: <strong>${installmentBank || '............................'}</strong> &nbsp;&nbsp;&nbsp;&nbsp; Khoản Vay: <strong>${debtAmountStr || '............................'}</strong>
            ${customerNote ? `
            <p class="note-line">Ghi chú: ${customerNote}</p>`:''}
            </div>
            <div class="info-row italic">
              (Viết bằng chữ: ....................................................................)
            </div>
            <div class="info-row">
              Số tiền khách đặt cọc: ....................................................................................................
            </div>
            <div class="info-row">
              Thu xe cũ ( tên xe ): ......................... Màu: ......................... Số VIN: .........................
            </div>

            <div style="margin: 10px 0 6px 0;">Sau khi bàn bạc và đi đến thống nhất, bên A đồng ý bán xe và bên B đồng ý mua xe với các điều khoản sau:</div>
          </div>

          <!-- BẢNG ĐIỀU KHOẢN -->
          <table class="grid-table">
            <thead>
              <tr>
                <th style="width: 50%; padding: 8px;" class="text-center">I. ĐIỀU KHOẢN VỀ BẢO HÀNH</th>
                <th style="width: 50%; padding: 8px;" class="text-center">II. HƯỚNG DẪN SỬ DỤNG ẮC QUY</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style="padding: 10px 12px; height: 100%;">
                  <div class="bold">YADEA</div>
                  <div style="margin-top: 3px;">1. Động cơ, IC, bộ sạc bảo hành 24 tháng. Bình bảo hành 24 tháng. ((Cụ thể lỗi 1 bình đổi cả bộ trong 18 tháng, lỗi bình nào đổi bình đó trong 6 tháng còn lại (Hoặc 20.000km))</div>
                  <div style="margin-top: 5px;">2. Động cơ, IC, bộ sạc bảo hành 36 tháng. Pin bảo hành 36 tháng (Hoặc 30.000km)</div>
                  <div style="margin-top: 5px;">3. Động cơ, IC, bộ sạc bảo hành 24 tháng. Bình bảo hành 12 tháng (Cụ thể lỗi 1 bình đổi cả bộ trong 9 tháng, lỗi bình nào đổi bình đó trong 3 tháng còn lại)</div>
                  <div class="bold" style="margin-top: 10px;">XE HÃNG KHÁC ( JP Motor, Detech, Victoria...)</div>
                  <div style="margin-top: 3px;">[ &nbsp; ] Bình bảo hành 12 tháng, phù 06 tháng (nên xem hướng dẫn sử dụng ắc quy).</div>
                  <div style="margin-top: 3px;">[ &nbsp; ] Bình bảo hành 12 tháng, phù 09 tháng (nên xem hướng dẫn sử dụng ắc quy)</div>
                  <div style="margin-top: 3px;">[ &nbsp; ] Bình bảo hành 24 tháng</div>
                  <div style="margin-top: 8px; line-height: 1.5;">
                    Động cơ: ........ Tháng<br />
                    IC: .................. Tháng<br />
                    Bộ Sạc: ............ Tháng
                  </div>
                </td>
                <td style="padding: 10px 12px;">
                  <div class="italic">
                    <strong>Lần sạc đầu tiên:</strong> Sau khi sạc ắc quy đầy, sạc báo đèn xanh, rút sạc ra đợi khoảng 20 phút, cắm lại cho sạc tiếp khoảng 1 tiếng.
                  </div>
                  <div class="italic" style="margin-top: 10px; line-height: 1.45;">
                    <strong>Trong quá trình sử dụng:</strong><br />
                    + Sau khi đi xe khoảng 30 phút để ắc quy nguội bớt rồi mới sạc.<br />
                    + Sạc sạc đầy mới sử dụng. Hạn chế tối đa tình trạng xe cạn ắc quy và sạc nhiều lần trong ngày.<br />
                    + Trường hợp có việc bận không có nhu cầu sử dụng xe, thì mỗi tuần nên sạc 1 lần.
                  </div>
                  <div class="bold text-center" style="margin-top: 25px; font-size: 10pt; line-height: 1.35; padding: 0 5px;">
                    ẮC QUY SẼ XUỐNG CẤP DẦN THEO THỜI GIAN NÊN HÃY SỬ DỤNG ĐÚNG CÁCH ĐỂ SỬ DỤNG ẮC QUY ĐƯỢC LÂU HƠN
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- TRANG 2 -->
      <div class="page page-break">
        <table class="grid-table" style="margin-top: 0;">
          <tbody>
            <tr>
              <td style="width: 50%; padding: 8px 10px;">
                <div class="bold">HONDA, YAMAHA, SUZUKI, SYM...</div>
                <div>1. Xe (Động cơ, khung sườn bảo hành theo sổ bảo hành chính hãng)</div>
                <div>2. Ắc quy khởi động bảo hành 12 tháng</div>
                <div>3. Bảo dưỡng định kỳ miễn phí tiền công theo quy định</div>
                <div>4. Các chi tiết hao mòn tự nhiên (lốp, nhông xích, bóng đèn, má phanh...) không thuộc trường hợp bảo hành.</div>
              </td>
              <td style="width: 50%;"></td>
            </tr>
            <tr>
              <td style="width: 50%; padding: 8px 10px;">
                <div class="bold">IV. Thoả thuận và thống nhất giữa hai bên như sau:</div>
                <div>* Giá bán xe chưa bao gồm lệ phí trước bạ, phí bấm biển số và phí dịch vụ (đối với xe máy).</div>
                <div style="margin-top: 2px;">* Dịch vụ bấm biển số (không bao bảo hiểm và phí kẹp biển số):</div>
                <div style="margin-top: 2px;">* Quà tặng: NÓN BẢO HIỂM CHÍNH HÃNG, ÁO MƯA</div>
              </td>
              <td style="width: 50%; padding: 8px 10px;">
                <div class="bold">V. Điều khoản chung:</div>
                <div>* Bên B đã kiểm tra xe mới 100%, không trầy xước, phụ tùng theo xe đầy đủ.</div>
                <div style="margin-top: 2px;">* Bên B đã được bên A hướng dẫn sử dụng xe, chế độ bảo hành và kỹ năng lái xe an toàn, nhận quà khuyến mãi đầy đủ... bên B đã đọc và xác nhận những nội dung trên.</div>
                <div style="margin-top: 2px;">* Biên nhận được lập thành 02 bản có giá trị như nhau, mỗi bên giữ 1 bản.</div>
              </td>
            </tr>
          </tbody>
        </table>

        <!-- LƯU Ý -->
        <div style="line-height: 1.25; margin-top: 6px;">
          <div><strong style="text-decoration: underline;">*LƯU Ý :</strong> &nbsp;* Phụ kiện theo xe: Sổ bảo hành, 02 chìa khóa.</div>
          <ul class="note-list" style="list-style-type: '✓ '; padding-left: 16px;">
            <li><strong style="text-decoration: underline;">Luôn Đội Nón bảo hiểm khi tham gia giao thông.</strong></li>
            <li>Những phần hao mòn trong quá trình sử dụng không bảo hành.</li>
            <li>Không bảo hành đối với xe đã thay đổi kết cấu, độ máy hoặc sử dụng sai quy cách.</li>
            <li>
              Bảo hành phải cho tháo xe, đồng thời xe phải được đem đến cửa hàng. (NẾU TRƯỜNG HỢP BẢO HÀNH TẬN NƠI – SẼ TÍNH PHÍ ĐI LẠI TÙY ĐIỀU KIỆN KHOẢNG CÁCH TỪ 100,000 ĐẾN 200,000 / 1 LẦN ĐI LẠI)<br />
              <span style="text-decoration: underline;">Điều kiện: Miễn Phí Cứu Hộ Trong tháng thứ 1 (Nếu có lỗi kỹ thuật từ nhà sản xuất)</span><br />
              Từ 1km đến 10km : 100.000đ / 1 lần đi lại.<br />
              Từ 10km – 15km : 150.000/ 1 lần đi lại.<br />
              Trên 20km (Trong Phạm vi Huyện Giồng Riềng cũ) : 200.000km
            </li>
            <li><strong style="text-decoration: underline;">Mọi vấn đề phát sinh với xe trong quá trình sử dụng phải đem đến cửa hàng.</strong></li>
            <li><strong style="text-decoration: underline;">ĐẶC BIỆT LƯU Ý: ẮC-QUI PHẢI ĐƯỢC SẠC THƯỜNG XUYÊN. TRÁNH TRƯỜNG HỢP MẤT NGUỒN HOẶC TUỘT ÁP, ĐẠI LÝ TỪ CHỐI BẢO HÀNH.</strong></li>
            <li>
              <strong>KHÁCH HÀNG ĐỔI XE:</strong><br />
              TRONG 12 GIỜ: KHÁCH HÀNG BÙ LỖ 10%<br />
              TRONG 3 NGÀY: KHÁCH HÀNG BÙ LỖ 20%<br />
              TRONG 30 NGÀY: KHÁCH HÀNG BÙ LỖ 30%<br />
              <strong style="text-decoration: underline;">( TRONG BẤT KỲ TRƯỜNG HỢP NÀO ) , ĐỐI VỚI XE XUẤT HÓA ĐƠN , ĐÃ ĐÓNG THUẾ TRƯỚC BẠ BÙ LỖ 30%.</strong>
            </li>
            <li><span style="text-decoration: underline;">Bên B ( Người Mua ) Đã được tư vấn xe phù hợp với độ tuổi , các xe có thể đăng ký biển số đã được khách hàng xác nhận.</span></li>
          </ul>
        </div>

        <div class="italic" style="font-size: 10pt; margin-top: 6px;">
          Tôi (bên B) hoàn toàn đồng ý với những thoả thuận trên.
        </div>

        <!-- CHỮ KÝ -->
        <table style="margin-top: 15px; text-align: center; font-size: 10.5pt;">
          <tbody>
            <tr>
              <td style="width: 50%; padding-bottom: 60px;">
                <strong>Bên bán A</strong><br />
                <i style="font-size: 9pt; text-decoration: underline;">(Ký và ghi rõ họ tên)</i>
              </td>
              <td style="width: 50%; padding-bottom: 60px;">
                <strong>Bên mua B</strong><br />
                <i style="font-size: 9pt; text-decoration: underline;">(Ký và ghi rõ họ tên)</i>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <script>
        window.onload = function() { window.print(); }
      </script>
    </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(htmlContent);
  printWindow.document.close();
};

export default function App() {
  const [currentUser, setCurrentUser] = useState<SystemAccount | null>(() => {
    const saved = localStorage.getItem('currentUser');
    return saved ? JSON.parse(saved) : null;
  });

  const [authLoading, setAuthLoading] = useState<boolean>(false);
  const [accounts, setAccounts] = useState<SystemAccount[]>(DEFAULT_FIXED_ACCOUNTS);
  const [activeTab, setActiveTab] = useState<string>('customers');

  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState<boolean>(false);
  const [selectedAccountToEdit, setSelectedAccountToEdit] = useState<SystemAccount | null>(null);

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [searchText, setSearchText] = useState<string>('');

  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);

  const [selectedCustomerDetail, setSelectedCustomerDetail] = useState<any>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState<boolean>(false);

  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);
  const [exportForm] = Form.useForm();
  const [form] = Form.useForm();
  const [loginForm] = Form.useForm();
  const [passwordForm] = Form.useForm();

  const [isPrintModalOpen, setIsPrintModalOpen] = useState<boolean>(false);
  const [selectedPrintCustomer, setSelectedPrintCustomer] = useState<Customer | null>(null);
  const [selectedBranchToPrint, setSelectedBranchToPrint] = useState<string>('Chi nhánh 1');

  const fetchAccountsFromCloud = async () => {
    try {
      const { data, error } = await supabase.from('Account').select('*');
      if (!error && data && data.length > 0) {
        const cloudAccounts: SystemAccount[] = data.map((item: any) => ({
          username: item.username,
          password: item.password,
          fullName: item.fullName || item.fullname || item.username,
          branch: item.branch,
          role: item.role || (item.username === 'admin' ? 'admin' : 'staff'),
        }));
        setAccounts(cloudAccounts);
      }
    } catch (err) {
      console.error('Lỗi tải tài khoản từ Supabase:', err);
    }
  };

  useEffect(() => {
    fetchAccountsFromCloud();
  }, []);

  const handleLogin = async (values: any) => {
    setAuthLoading(true);
    const { username, password } = values;
    const cleanUsername = username.trim().toLowerCase();
    const cleanPassword = password.trim();

    try {
      const { data, error } = await supabase
        .from('Account')
        .select('*')
        .ilike('username', cleanUsername)
        .eq('password', cleanPassword)
        .maybeSingle();

      if (!error && data) {
        const loggedInUser: SystemAccount = {
          username: data.username,
          password: data.password,
          fullName: data.fullName || data.fullname || data.username,
          branch: data.branch,
          role: data.role || (data.username === 'admin' ? 'admin' : 'staff'),
        };
        message.success(`Đăng nhập thành công: ${loggedInUser.fullName}!`);
        localStorage.setItem('currentUser', JSON.stringify(loggedInUser));
        setCurrentUser(loggedInUser);

        await logActivity({
          actionType: 'LOGIN',
          description: `Đăng nhập vào hệ thống (${loggedInUser.fullName})`,
          user: {
            username: loggedInUser.username,
            fullName: loggedInUser.fullName,
            branch: loggedInUser.branch,
          },
        });

        setAuthLoading(false);
        return;
      }
    } catch (err) {
      console.error('Lỗi xác thực Supabase:', err);
    }

    message.error('Tên tài khoản hoặc mật khẩu không chính xác!');
    setAuthLoading(false);
  };

  const handleChangePassword = async (values: any) => {
    if (!selectedAccountToEdit) return;
    const { newPassword } = values;
    const cleanNewPassword = newPassword.trim();

    try {
      const { error } = await supabase
        .from('Account')
        .update({ password: cleanNewPassword })
        .eq('username', selectedAccountToEdit.username);

      if (error) {
        message.error('Lỗi khi cập nhật mật khẩu lên Cloud: ' + error.message);
        return;
      }

      message.success(`Đã đổi mật khẩu cho tài khoản [${selectedAccountToEdit.username}] thành công!`);

      await logActivity({
        actionType: 'STATUS_CHANGE',
        description: `Đổi mật khẩu tài khoản [${selectedAccountToEdit.username}]`,
      });

      setIsPasswordModalOpen(false);
      passwordForm.resetFields();
      await fetchAccountsFromCloud();

      if (currentUser?.username === selectedAccountToEdit.username) {
        const updatedCurrent = { ...currentUser, password: cleanNewPassword };
        setCurrentUser(updatedCurrent);
        localStorage.setItem('currentUser', JSON.stringify(updatedCurrent));
      }
    } catch (err: any) {
      message.error('Lỗi kết nối máy chủ Supabase: ' + err.message);
    }
  };

  const handleLogout = async () => {
    if (currentUser) {
      await logActivity({
        actionType: 'LOGOUT',
        description: `Đăng xuất khỏi hệ thống (${currentUser.fullName})`,
      });
    }
    localStorage.removeItem('currentUser');
    setCurrentUser(null);
    loginForm.resetFields();
    message.info('Đã đăng xuất khỏi hệ thống');
  };

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${BASE_API_URL}/customers?limit=100000&pageSize=100000`);
      if (response.data && response.data.success && Array.isArray(response.data.data)) {
        setCustomers(response.data.data);
      } else if (Array.isArray(response.data)) {
        setCustomers(response.data);
      }
    } catch (error) {
      console.error('Lỗi khi tải dữ liệu:', error);
      message.error('Không thể tải dữ liệu từ máy chủ!');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser) {
      fetchCustomers();
    }
  }, [currentUser]);

  const staffOptions = useMemo(() => {
    const staffSet = new Set<string>();
    customers.forEach((c) => {
      const name = c.staffName || c.nhan_vien;
      if (name && name.trim()) staffSet.add(name.trim());
    });
    return Array.from(staffSet).map((name) => ({ label: name, value: name }));
  }, [customers]);

  const branchOptions = useMemo(() => {
    return [
      { label: 'Chi nhánh 1', value: 'Chi nhánh 1' },
      { label: 'Chi nhánh 2', value: 'Chi nhánh 2' },
      { label: 'Khách sỉ', value: 'Khách sỉ' },
    ];
  }, []);

  const brandOptions = useMemo(() => {
    const brandSet = new Set<string>();
    customers.forEach((c) => {
      const fullVName = extractVehicleInfo(c);
      const b = (c.brand || fullVName.split(' ')[0] || '').trim();
      if (b && b !== '---') brandSet.add(b);
    });
    return Array.from(brandSet).map((b) => ({ label: b, value: b }));
  }, [customers]);

  const handleOpenPrintModal = (record: Customer) => {
    setSelectedPrintCustomer(record);
    const currentBranch = (record.branchName || record.chi_nhanh || '').trim().toLowerCase();
    if (currentBranch.includes('2')) {
      setSelectedBranchToPrint('Chi nhánh 2');
    } else {
      setSelectedBranchToPrint('Chi nhánh 1');
    }
    setIsPrintModalOpen(true);
  };

  const handleConfirmPrint = () => {
    if (selectedPrintCustomer) {
      executePrintContract(selectedPrintCustomer);
      setIsPrintModalOpen(false);
    }
  };

  const handleOpenAddModal = () => {
    setEditingCustomer(null);
    form.resetFields();
    if (currentUser) {
      form.setFieldsValue({
        branchName: currentUser.branch || 'Chi nhánh 1',
      });
    }
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (record: Customer) => {
    setEditingCustomer(record);
    const fullVName = extractVehicleInfo(record);
    const nameParts = fullVName !== '---' ? fullVName.split(' ') : [];
    const brand = record.brand || nameParts[0] || '';
    const model = record.model || nameParts.slice(1).join(' ') || '';

    form.setFieldsValue({
      fullName: record.fullName || record.ho_ten || '',
      phone: record.phone || record.dien_thoai || '',
      address: record.address || record.dia_chi || '',
      brand,
      model,
      color: record.color || record.mau || '',
      price: record.price ? Number(record.price) : record.gia_xe ? Number(record.gia_xe) : 0,
      prepaidAmount: record.prepaidAmount ? Number(record.prepaidAmount) : record.so_tien_tra_truoc ? Number(record.so_tien_tra_truoc) : 0,
      installmentBank: record.installmentBank || '',
      debtAmount: record.debtAmount ? Number(record.debtAmount) : 0,
      note: record.note || record.ghi_chu || '',
      staffName: record.staffName || record.nhan_vien || '',
      branchName: record.branchName || record.chi_nhanh || 'Chi nhánh 1',
      frameNumber: record.frameNumber || record.so_khung || '',
      batteryNumber: record.batteryNumber || record.so_pin || '',
      email: record.email || '',
      idCardNumber: record.idCardNumber || '',
      idCardIssueDate: record.idCardIssueDate || '',
      promotion: record.promotion || record['Ưu đãi/Quà tặng'] || record['uudai_quatang'] || '',
    });
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (values: any) => {
    setSubmitting(true);

    const parseMoney = (val: any) => {
      if (typeof val === 'number') return Math.round(val);
      if (typeof val === 'string') return parseInt(val.replace(/[^0-9]/g, ''), 10) || 0;
      return 0;
    };

    const parsedPrice = parseMoney(values.price);
    const parsedPrepaid = parseMoney(values.prepaidAmount);
    const parsedDebt = parseMoney(values.debtAmount);

    const payload = {
      fullName: values.fullName?.trim() || '',
      phone: values.phone?.trim() || '',
      address: values.address?.trim() || '',
      brand: values.brand?.trim() || '',
      model: values.model?.trim() || '',
      color: values.color?.trim() || '',
      frameNumber: values.frameNumber?.trim() || '',
      batteryNumber: values.batteryNumber?.trim() || '',
      price: parsedPrice,
      staffName: values.staffName?.trim() || '',
      branchName: values.branchName || 'Chi nhánh 1',
      vehicleName: `${values.brand || ''} ${values.model || ''}`.trim(),

      // ⚡ THÊM 2 TRƯỜNG MỚI VÀO PAYLOAD:
      prepaidAmount: parsedPrepaid,
      so_tien_tra_truoc: parsedPrepaid,
      note: values.note?.trim() || '',
      ghi_chu: values.note?.trim() || '',

      installmentBank: values.installmentBank?.trim() || '',
      debtAmount: parsedDebt,
      email: values.email?.trim() || '',
      idCardNumber: values.idCardNumber?.trim() || '',
      idCardIssueDate: values.idCardIssueDate?.trim() || '',

      ho_ten: values.fullName?.trim() || '',
      dien_thoai: values.phone?.trim() || '',
      dia_chi: values.address?.trim() || '',
      mau: values.color?.trim() || '',
      gia_xe: parsedPrice,
      nhan_vien: values.staffName?.trim() || '',
      chi_nhanh: values.branchName || 'Chi nhánh 1',
      so_khung: values.frameNumber?.trim() || '',
      so_pin: values.batteryNumber?.trim() || '',
      promotion: values.promotion?.trim() || '',
      'Ưu đãi/Quà tặng': values.promotion?.trim() || '',
    };

    try {
      if (editingCustomer && editingCustomer.id) {
        await axios.put(`${BASE_API_URL}/customers/${editingCustomer.id}`, payload);
        message.success('Cập nhật thành công!');

        await logActivity({
          actionType: 'STATUS_CHANGE',
          description: `Sửa thông tin khách hàng: [${values.fullName}] - SĐT: [${values.phone}]`,
        });
      } else {
        await axios.post(`${BASE_API_URL}/customers`, payload);
        message.success('Thêm mới thành công!');

        const frameNum = (values.frameNumber || '').trim();
        const branch = values.branchName || currentUser?.branch || 'Chi nhánh 1';

        await logActivity({
          actionType: 'SALE',
          description: `Bán xe [${values.brand || ''} ${values.model || ''}] - Khách: [${values.fullName}] - Số khung: [${frameNum || 'N/A'}] - Chi nhánh: [${branch}]`,
        });
      }
      setIsModalOpen(false);
      form.resetFields();
      fetchCustomers();
    } catch (error: any) {
      console.error('Lỗi chi tiết từ Server:', error.response?.data || error);
      message.error(`Lỗi Server (500): ${error.message || 'Internal Server Error'}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id?: number) => {
    if (!id) return;
    try {
      const targetCustomer = customers.find((c) => c.id === id);
      await axios.delete(`${BASE_API_URL}/customers/${id}`);
      message.success('Đã xóa thành công!');

      await logActivity({
        actionType: 'DELETE',
        description: `Xóa hồ sơ khách hàng: [${targetCustomer?.fullName || targetCustomer?.ho_ten || id}] - SĐT: [${targetCustomer?.phone || 'N/A'}]`,
      });

      fetchCustomers();
    } catch {
      message.error('Xóa thất bại!');
    }
  };

  const handleExportExcel = async (values: any) => {
    const { dateRange, staffName, branchName } = values;
    const hideLoading = message.loading('Đang tải dữ liệu để xuất Excel...', 0);

    try {
      let allCustomers: Customer[] = [];
      const response = await axios.get(`${BASE_API_URL}/customers?limit=100000&pageSize=100000`);

      if (response.data && response.data.success && Array.isArray(response.data.data)) {
        allCustomers = response.data.data;
      } else if (Array.isArray(response.data)) {
        allCustomers = response.data;
      } else {
        allCustomers = [...customers];
      }

      let filtered = [...allCustomers];

      if (dateRange && dateRange[0] && dateRange[1]) {
        const startDate = dateRange[0].startOf('day');
        const endDate = dateRange[1].endOf('day');

        filtered = filtered.filter((item) => {
          const { fullDate } = parseDateDetails(item);
          if (!fullDate || fullDate === '---') return false;

          const itemDate = dayjs(fullDate, 'DD/MM/YYYY');
          if (!itemDate.isValid()) return false;

          return (
            (itemDate.isAfter(startDate) || itemDate.isSame(startDate)) &&
            (itemDate.isBefore(endDate) || itemDate.isSame(endDate))
          );
        });
      }

      if (staffName) {
        filtered = filtered.filter((item) => (item.staffName || item.nhan_vien) === staffName);
      }
      if (branchName) {
        filtered = filtered.filter((item) => (item.branchName || item.chi_nhanh) === branchName);
      }

      hideLoading();

      if (filtered.length === 0) {
        message.warning('Không tìm thấy dữ liệu phù hợp với bộ lọc!');
        return;
      }

      const excelData = filtered.map((item, index) => {
        const { fullDate } = parseDateDetails(item);
        return {
          'STT': index + 1,
          'ID Đơn': `#${item.id || index + 1}`,
          'Thời Gian Mua': fullDate,
          'Khách Hàng': item.fullName || item.ho_ten || '---',
          'Số Điện Thoại': item.phone || item.dien_thoai || '---',
          'Địa Chỉ': item.address || item.dia_chi || '---',
          'Tên Xe / Hãng': extractVehicleInfo(item),
          'Màu Sắc': item.color || item.mau || '---',
          'Số Khung': item.frameNumber || item.so_khung || '---',
          'Số Máy / Acquy': item.batteryNumber || item.so_pin || '---',
          'Giá Bán (VNĐ)': item.price
            ? Number(item.price).toLocaleString('vi-VN')
            : item.gia_xe
            ? Number(item.gia_xe).toLocaleString('vi-VN')
            : '0',
          'Số Tiền Trả Trước (VNĐ)': item.prepaidAmount
            ? Number(item.prepaidAmount).toLocaleString('vi-VN')
            : item.so_tien_tra_truoc
            ? Number(item.so_tien_tra_truoc).toLocaleString('vi-VN')
            : '0',
          'Ngân Hàng Góp': item.installmentBank || '---',
          'Số Tiền Còn Nợ (VNĐ)': item.debtAmount
            ? Number(item.debtAmount).toLocaleString('vi-VN')
            : '0',
          'Ưu đãi / Quà tặng': item.promotion || item['Ưu đãi/Quà tặng'] || item.uudai_quatang || '---',
          'Ghi Chú': item.note || item.ghi_chu || '---',
          'Nhân Viên': item.staffName || item.nhan_vien || '---',
          'Chi Nhánh': item.branchName || item.chi_nhanh || '---',
        };
      });

      const worksheet = XLSX.utils.json_to_sheet(excelData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'DanhSachKhachHang');
      XLSX.writeFile(workbook, `Danh_Sach_Khach_Hang_${dayjs().format('DDMMYYYY_HHmmss')}.xlsx`);

      message.success(`Đã xuất thành công ${filtered.length} dòng dữ liệu!`);
      setIsExportModalOpen(false);
    } catch (error) {
      hideLoading();
      message.error('Lỗi khi tải toàn bộ dữ liệu xuất Excel!');
    }
  };

  const filteredCustomers = customers.filter((item) => {
    const searchLower = searchText.toLowerCase().trim();
    const fullVehicleName = extractVehicleInfo(item);
    const name = item.fullName || item.ho_ten || '';
    const phone = item.phone || item.dien_thoai || '';
    const address = item.address || item.dia_chi || '';
    const color = item.color || item.mau || '';
    const frameNumber = item.frameNumber || item.so_khung || '';
    const batteryNumber = item.batteryNumber || item.so_pin || '';
    const staff = item.staffName || item.nhan_vien || '';
    const branch = item.branchName || item.chi_nhanh || '';
    const bank = item.installmentBank || '';
    const noteStr = item.note || item.ghi_chu || '';

    // ⚡ Lấy chuỗi thời gian mua từ các biến có thể có
    const rawDate = item.formTimestamp || item.timestamp || item.createdAt || item.date || '';
    
    // Đảm bảo định dạng DD/MM/YYYY để hỗ trợ tìm kiếm dạng "14/09/2026" hoặc "14/09"
    let formattedDate = rawDate;
    if (rawDate && rawDate.includes('-')) {
      const parts = rawDate.split('T')[0].split('-'); // Lấy phần YYYY-MM-DD
      if (parts.length === 3) {
        formattedDate = `${parts[2]}/${parts[1]}/${parts[0]} ${rawDate}`; // Ghép thêm DD/MM/YYYY
      }
    }

    return (
      name.toLowerCase().includes(searchLower) ||
      phone.includes(searchLower) ||
      address.toLowerCase().includes(searchLower) ||
      color.toLowerCase().includes(searchLower) ||
      fullVehicleName.toLowerCase().includes(searchLower) ||
      frameNumber.toLowerCase().includes(searchLower) ||
      batteryNumber.toLowerCase().includes(searchLower) ||
      staff.toLowerCase().includes(searchLower) ||
      branch.toLowerCase().includes(searchLower) ||
      bank.toLowerCase().includes(searchLower) ||
      noteStr.toLowerCase().includes(searchLower) ||
      // ⚡ Bổ sung tìm kiếm theo Thời gian mua
      formattedDate.toLowerCase().includes(searchLower)
    );
  });

  // ⚡ BẢNG COLUMNS ĐÃ BỔ SUNG CỘT TRẢ TRƯỚC VÀ GHI CHÚ
  const columns: ColumnsType<Customer> = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      render: (id?: number) => <Text type="secondary" style={{ whiteSpace: 'nowrap' }}>#{id || '---'}</Text>,
      width: 65,
      align: 'center',
    },
    {
      title: 'THỜI GIAN MUA',
      dataIndex: 'formTimestamp',
      key: 'formTimestamp',
      render: (_: any, record: Customer) => {
        const { fullDate } = parseDateDetails(record);
        return (
          <Text style={{ fontSize: '13px', color: '#1677ff', fontWeight: 600, whiteSpace: 'nowrap' }}>
            {fullDate}
          </Text>
        );
      },
      width: 125,
      align: 'center',
    },
    {
      title: 'KHÁCH HÀNG',
      dataIndex: 'fullName',
      key: 'fullName',
      render: (_: any, record: Customer) => (
        <span style={{ fontWeight: 600, color: '#1f1f1f' }}>
          {record.fullName || record.ho_ten || '---'}
        </span>
      ),
      width: 170,
    },
    {
      title: 'SỐ ĐIỆN THOẠI',
      dataIndex: 'phone',
      key: 'phone',
      render: (_: any, record: Customer) => {
        const phoneVal = record.phone || record.dien_thoai || '';
        return (
          <a
            href={`tel:${phoneVal}`}
            style={{ color: '#1677ff', fontWeight: 500, whiteSpace: 'nowrap' }}
            onClick={(e) => e.stopPropagation()}
          >
            {phoneVal || '---'}
          </a>
        );
      },
      width: 120,
    },
    {
      title: 'ĐỊA CHỈ',
      dataIndex: 'address',
      key: 'address',
      render: (_: any, record: Customer) => <span style={{ fontSize: '13px', color: '#595959' }}>{record.address || record.dia_chi || '---'}</span>,
      width: 200,
    },
    {
      title: 'TÊN XE / HÃNG',
      key: 'vehicleName',
      render: (_: any, record: Customer) => {
        const name = extractVehicleInfo(record);
        return <strong style={{ color: '#262626', whiteSpace: 'nowrap' }}>{name}</strong>;
      },
      width: 170,
    },
    {
      title: 'MÀU XE',
      dataIndex: 'color',
      key: 'color',
      render: (_: any, record: Customer) => {
        const colorVal = record.color || record.mau;
        return colorVal ? (
          <Tag color="cyan" style={{ borderRadius: 4, fontWeight: 500, whiteSpace: 'nowrap', textTransform: 'capitalize' }}>
            {colorVal}
          </Tag>
        ) : (
          <Text type="secondary">---</Text>
        );
      },
      width: 110,
      align: 'center',
    },
    {
      title: 'SỐ KHUNG',
      dataIndex: 'frameNumber',
      key: 'frameNumber',
      render: (_: any, record: Customer) => {
        const frameVal = record.frameNumber || record.so_khung;
        return frameVal ? <Text code style={{ color: '#d46b08', fontWeight: 600, whiteSpace: 'nowrap' }}>{frameVal}</Text> : <Text type="secondary">---</Text>;
      },
      width: 110,
      align: 'center',
    },
    {
      title: 'SỐ MÁY / ACQUY',
      dataIndex: 'batteryNumber',
      key: 'batteryNumber',
      render: (_: any, record: Customer) => {
        const batVal = record.batteryNumber || record.so_pin;
        return batVal ? <Text code style={{ color: '#389e0d', fontWeight: 600, whiteSpace: 'nowrap' }}>{batVal}</Text> : <Text type="secondary">---</Text>;
      },
      width: 110,
      align: 'center',
    },
    {
      title: 'GIÁ BÁN',
      dataIndex: 'price',
      key: 'price',
      render: (_: any, record: Customer) => {
        const numPrice = Number(record.price || record.gia_xe);
        if (!isNaN(numPrice) && numPrice > 0) {
          return (
            <span style={{ fontWeight: 600, color: '#389e0d', whiteSpace: 'nowrap' }}>
              {numPrice.toLocaleString('vi-VN')} VNĐ
            </span>
          );
        }
        return <Text type="secondary">---</Text>;
      },
      width: 130,
      align: 'right',
    },
    // ⚡ CỘT 1: SỐ TIỀN TRẢ TRƯỚC
    {
      title: 'TRẢ TRƯỚC',
      dataIndex: 'prepaidAmount',
      key: 'prepaidAmount',
      render: (_: any, record: Customer) => {
        const numPrepaid = Number(record.prepaidAmount || record.so_tien_tra_truoc);
        if (!isNaN(numPrepaid) && numPrepaid > 0) {
          return (
            <span style={{ fontWeight: 600, color: '#096dd9', whiteSpace: 'nowrap' }}>
              {numPrepaid.toLocaleString('vi-VN')} VNĐ
            </span>
          );
        }
        return <Text type="secondary">---</Text>;
      },
      width: 130,
      align: 'right',
    },
    {
      title: 'NGÂN HÀNG GÓP',
      dataIndex: 'installmentBank',
      key: 'installmentBank',
      render: (_: any, record: Customer) => {
        const bank = record.installmentBank;
        return bank ? (
          <Tag color="purple" style={{ borderRadius: 4, fontWeight: 500, whiteSpace: 'nowrap' }}>
            {bank}
          </Tag>
        ) : (
          <Text type="secondary">---</Text>
        );
      },
      width: 140,
      align: 'center',
    },
    {
      title: 'SỐ TIỀN CÒN NỢ',
      dataIndex: 'debtAmount',
      key: 'debtAmount',
      render: (_: any, record: Customer) => {
        const debt = Number(record.debtAmount);
        if (!isNaN(debt) && debt > 0) {
          return (
            <span style={{ fontWeight: 600, color: '#cf1322', whiteSpace: 'nowrap' }}>
              {debt.toLocaleString('vi-VN')} VNĐ
            </span>
          );
        }
        return <Text type="secondary">---</Text>;
      },
      width: 130,
      align: 'right',
    },
    {
      title: 'ƯU ĐÃI / QUÀ TẶNG',
      dataIndex: 'promotion',
      key: 'promotion',
      render: (_: any, record: Customer) => {
        const promoVal = record.promotion || record['Ưu đãi/Quà tặng'] || record['uudai_quatang'];
        return promoVal ? (
          <span style={{ color: '#d46b08', fontStyle: 'italic', fontSize: '13px' }}>
            {promoVal}
          </span>
        ) : (
          <Text type="secondary">---</Text>
        );
      },
      width: 160,
    },    
    // ⚡ CỘT 2: GHI CHÚ
    {
      title: 'GHI CHÚ',
      dataIndex: 'note',
      key: 'note',
      render: (_: any, record: Customer) => {
        const noteVal = record.note || record.ghi_chu;
        return noteVal ? (
          <span style={{ fontSize: '12px', color: '#595959', fontStyle: 'italic' }}>
            {noteVal}
          </span>
        ) : (
          <Text type="secondary">---</Text>
        );
      },
      width: 160,
    },
    {
      title: 'NHÂN VIÊN',
      dataIndex: 'staffName',
      key: 'staffName',
      render: (_: any, record: Customer) => {
        const staffVal = record.staffName || record.nhan_vien;
        return staffVal ? (
          <Tag color="gold" style={{ borderRadius: 4, fontWeight: 500, whiteSpace: 'nowrap' }}>
            {staffVal}
          </Tag>
        ) : (
          <Text type="secondary">---</Text>
        );
      },
      width: 120,
      align: 'center',
    },
    {
      title: 'CHI NHÁNH',
      dataIndex: 'branchName',
      key: 'branchName',
      render: (_: any, record: Customer) => {
        const branchVal = record.branchName || record.chi_nhanh;
        return branchVal ? (
          <Tag color="blue" style={{ borderRadius: 4, fontWeight: 500, whiteSpace: 'nowrap' }}>
            {branchVal}
          </Tag>
        ) : (
          <Text type="secondary">---</Text>
        );
      },
      width: 110,
      align: 'center',
    },
    {
      title: 'THAO TÁC',
      key: 'actions',
      render: (_: any, record: Customer) => (
        <Space size="small" onClick={(e) => e.stopPropagation()}>
          <Button
            type="primary"
            size="small"
            icon={<PrinterOutlined />}
            style={{ backgroundColor: '#722ed1', borderColor: '#722ed1', borderRadius: 4, fontWeight: 500 }}
            onClick={() => handleOpenPrintModal(record)}
          >
            In HD
          </Button>
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleOpenEditModal(record)}>
            Sửa
          </Button>
          {currentUser?.role === 'admin' && (
            <Popconfirm
              title="Xác nhận xóa"
              description="Bạn có chắc chắn muốn xóa khách hàng này?"
              onConfirm={() => handleDelete(record.id)}
              okText="Xóa"
              cancelText="Hủy"
              okButtonProps={{ danger: true }}
            >
              <Button type="link" size="small" danger icon={<DeleteOutlined />}>
                Xóa
              </Button>
            </Popconfirm>
          )}
        </Space>
      ),
      width: 180,
      align: 'center',
    },
  ];

  if (!currentUser) {
    return (
      <div
        style={{
          minHeight: '100vh',
          width: '100%',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          background: 'linear-gradient(135deg, #096dd9 0%, #001529 100%)',
          padding: '12px',
          boxSizing: 'border-box',
        }}
      >
        <Card
          bordered={false}
          style={{
            width: '100%',
            maxWidth: 420,
            borderRadius: 16,
            boxShadow: '0 12px 32px rgba(0,0,0,0.3)',
            padding: '24px 16px',
            textAlign: 'center',
          }}
        >
          <div style={{ marginBottom: 24 }}>
            <div
              style={{
                width: 64,
                height: 64,
                background: '#e6f7ff',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px auto',
                color: '#1890ff',
                fontSize: 28,
              }}
            >
              <ShopOutlined />
            </div>
            <Title level={3} style={{ margin: 0, color: '#1f1f1f', fontWeight: 700 }}>
              XE MÁY TÙNG PHƯỢNG
            </Title>
            <Text type="secondary" style={{ fontSize: 13 }}>
              Hệ thống Quản lý Bán xe & In Hợp đồng
            </Text>
          </div>

          <Form form={loginForm} layout="vertical" onFinish={handleLogin} size="large">
            <Form.Item
              name="username"
              rules={[{ required: true, message: 'Vui lòng nhập tên tài khoản!' }]}
            >
              <Input
                prefix={<UserOutlined style={{ color: '#bfbfbf' }} />}
                placeholder="Tài khoản (admin / chinhanh1 / chinhanh2...)"
                style={{ borderRadius: 8 }}
              />
            </Form.Item>

            <Form.Item
              name="password"
              rules={[{ required: true, message: 'Vui lòng nhập mật khẩu!' }]}
            >
              <Input.Password
                prefix={<LockOutlined style={{ color: '#bfbfbf' }} />}
                placeholder="Mật khẩu"
                style={{ borderRadius: 8 }}
              />
            </Form.Item>

            <Form.Item style={{ marginTop: 24, marginBottom: 12 }}>
              <Button
                type="primary"
                htmlType="submit"
                loading={authLoading}
                block
                style={{
                  height: 44,
                  borderRadius: 8,
                  fontWeight: 600,
                  fontSize: 15,
                  backgroundColor: '#1890ff',
                }}
              >
                ĐĂNG NHẬP HỆ THỐNG
              </Button>
            </Form.Item>
          </Form>
        </Card>
      </div>
    );
  }

  const tabItems = [
    {
      key: 'customers',
      label: (
        <span>
          <OrderedListOutlined /> Danh Sách Khách Hàng ({customers.length})
        </span>
      ),
      children: (
        <div style={{ width: '100%', overflowX: 'hidden' }}>
          <div style={{ marginBottom: 16 }}>
            <Input
              placeholder="Tìm theo tên khách, SĐT, địa chỉ, ngân hàng, CCCD, Email, màu sắc, ghi chú..."
              prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
              value={searchText}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setSearchText(e.target.value)}
              allowClear
              size="middle"
              style={{ borderRadius: 8, width: '100%', maxWidth: 600 }}
            />
          </div>

          <Table<Customer>
            dataSource={filteredCustomers}
            columns={columns}
            rowKey={(record) => record.id || Math.random()}
            loading={loading}
            pagination={{
              pageSize: 10,
              showTotal: (total) => `Tổng cộng ${total} khách hàng`,
              showSizeChanger: false,
              simple: window.innerWidth < 768,
            }}
            scroll={{ x: 2300 }}
            size="small"
            onRow={(record) => ({
              onClick: () => {
                setSelectedCustomerDetail(record);
                setIsDetailModalOpen(true);
              },
              style: { cursor: 'pointer' },
            })}
          />
        </div>
      ),
    },
    {
      key: 'inventory',
      label: (
        <span>
          <InboxOutlined /> Quản Lý Tồn Kho & Luân Chuyển
        </span>
      ),
      children: <InventoryManagement currentUser={currentUser} />,
    },
    ...(currentUser.role === 'admin'
      ? [
          {
            key: 'analytics',
            label: (
              <span>
                <BarChartOutlined /> Báo Cáo & Thống Kê Doanh Số Chi Nhánh
              </span>
            ),
            children: (
              <SalesAnalytics
                customers={customers}
                brandOptions={brandOptions}
                parseDateDetails={parseDateDetails}
              />
            ),
          },
          {
            key: 'activity-log',
            label: (
              <span>
                <HistoryOutlined /> Lịch Sử Thao Tác
              </span>
            ),
            children: <ActivityLogView />,
          },
        ]
      : []),
  ];

  return (
    <div
      style={{
        padding: '8px',
        backgroundColor: '#f0f2f5',
        minHeight: '100vh',
        width: '100%',
        maxWidth: '100vw',
        overflowX: 'hidden',
        boxSizing: 'border-box',
      }}
    >
      <Card
        bordered={false}
        bodyStyle={{ padding: window.innerWidth < 768 ? '12px 8px' : '20px' }}
        style={{
          borderRadius: 12,
          boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
          width: '100%',
          maxWidth: 1600,
          margin: '0 auto',
          boxSizing: 'border-box',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: window.innerWidth < 768 ? 'column' : 'row',
            justifyContent: 'space-between',
            alignItems: window.innerWidth < 768 ? 'flex-start' : 'center',
            gap: '12px',
            marginBottom: 16,
            borderBottom: '1px solid #f0f0f0',
            paddingBottom: 12,
            width: '100%',
          }}
        >
          <div>
            <Title level={3} style={{ margin: 0, fontSize: window.innerWidth < 768 ? '18px' : '22px', color: '#1f1f1f' }}>
              XE MÁY TÙNG PHƯỢNG - HỆ THỐNG QUẢN LÝ BÁN XE & IN HỢP ĐỒNG
            </Title>
            <Space wrap style={{ marginTop: 4 }}>
              <Text type="secondary" style={{ fontSize: '13px' }}>
                Đang làm việc: <strong>{currentUser.fullName}</strong>
              </Text>
              <Tag color={currentUser.role === 'admin' ? 'red' : 'blue'}>
                {currentUser.role === 'admin' ? '👑 Admin' : `CN: ${currentUser.branch}`}
              </Tag>
            </Space>
          </div>

          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '8px',
              width: window.innerWidth < 768 ? '100%' : 'auto',
            }}
          >
            {currentUser.role === 'admin' && (
              <Button
                type="primary"
                style={{ backgroundColor: '#fa8c16', borderColor: '#fa8c16', borderRadius: 6, fontWeight: 500 }}
                icon={<SafetyCertificateOutlined />}
                onClick={() => {
                  fetchAccountsFromCloud();
                  setSelectedAccountToEdit(accounts[0]);
                  setIsPasswordModalOpen(true);
                }}
              >
                Đổi MK Cloud
              </Button>
            )}

            <Button
              type="primary"
              style={{ backgroundColor: '#217346', borderColor: '#217346', borderRadius: 6, fontWeight: 500 }}
              icon={<FileExcelOutlined />}
              onClick={() => {
                exportForm.resetFields();
                setIsExportModalOpen(true);
              }}
            >
              Xuất Excel
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenAddModal} style={{ borderRadius: 6, fontWeight: 500 }}>
              Thêm mới
            </Button>
            <Button icon={<ReloadOutlined />} loading={loading} onClick={fetchCustomers} style={{ borderRadius: 6 }}>
              Tải lại
            </Button>
            <Button danger icon={<LogoutOutlined />} onClick={handleLogout} style={{ borderRadius: 6 }}>
              Đăng xuất
            </Button>
          </div>
        </div>

        <Tabs
          activeKey={activeTab}
          onChange={(k) => setActiveTab(k)}
          type="card"
          items={tabItems}
        />
      </Card>

      {/* Modal Admin Đổi Mật Khẩu */}
      <Modal
        title={
          <Space>
            <SafetyCertificateOutlined style={{ color: '#fa8c16' }} />
            <span>Quản Lý Mật Khẩu Tài Khoản (Đồng Bộ Cloud)</span>
          </Space>
        }
        open={isPasswordModalOpen}
        onCancel={() => setIsPasswordModalOpen(false)}
        footer={null}
        width="95%"
        style={{ maxWidth: '750px' }}
        destroyOnClose
      >
        <Table<SystemAccount>
          dataSource={accounts}
          rowKey="username"
          pagination={false}
          size="small"
          bordered
          columns={[
            {
              title: 'TÊN TÀI KHOẢN',
              dataIndex: 'username',
              key: 'username',
              render: (text, record) => (
                <Space>
                  <Text code strong>{text}</Text>
                  {record.role === 'admin' && <Tag color="red">Admin</Tag>}
                </Space>
              ),
            },
            {
              title: 'TÊN CHI NHÁNH',
              dataIndex: 'fullName',
              key: 'fullName',
            },
            {
              title: 'MẬT KHẨU',
              dataIndex: 'password',
              key: 'password',
              render: (pwd) => <Text copyable={{ text: pwd }}>••••••</Text>,
            },
            {
              title: 'THAO TÁC',
              key: 'action',
              render: (_, record) => (
                <Button
                  size="small"
                  icon={<KeyOutlined />}
                  onClick={() => {
                    setSelectedAccountToEdit(record);
                    passwordForm.resetFields();
                  }}
                >
                  Đổi MK
                </Button>
              ),
            },
          ]}
        />

        {selectedAccountToEdit && (
          <Card
            type="inner"
            title={`Đổi mật khẩu cho: [${selectedAccountToEdit.username}] - ${selectedAccountToEdit.fullName}`}
            style={{ marginTop: 16 }}
          >
            <Form form={passwordForm} layout="vertical" onFinish={handleChangePassword}>
              <Form.Item
                name="newPassword"
                rules={[
                  { required: true, message: 'Nhập MK mới!' },
                  { min: 4, message: 'Tối thiểu 4 ký tự!' },
                ]}
              >
                <Input.Password placeholder="Nhập mật khẩu mới..." style={{ width: '100%' }} />
              </Form.Item>
              <Form.Item>
                <Button type="primary" htmlType="submit" block>
                  Lưu Lên Toàn Hệ Thống
                </Button>
              </Form.Item>
            </Form>
          </Card>
        )}
      </Modal>

      {/* Modal Chọn Chi Nhánh In Hợp Đồng */}
      <Modal
        title={
          <Space>
            <ShopOutlined style={{ color: '#722ed1' }} />
            <span>Chọn Chi Nhánh In Hợp Đồng</span>
          </Space>
        }
        open={isPrintModalOpen}
        onCancel={() => setIsPrintModalOpen(false)}
        onOk={handleConfirmPrint}
        okText="In Hợp Đồng Ngay"
        cancelText="Hủy"
        okButtonProps={{ style: { backgroundColor: '#722ed1', borderColor: '#722ed1' } }}
        destroyOnClose
        width="95%"
        style={{ maxWidth: '420px' }}
      >
        <div style={{ padding: '12px 0' }}>
          <Text style={{ display: 'block', marginBottom: 10 }}>
            Khách hàng: <strong>{selectedPrintCustomer?.fullName || selectedPrintCustomer?.ho_ten}</strong>
          </Text>
          <Text style={{ display: 'block', marginBottom: 8, color: '#595959' }}>
            Vui lòng chọn chi nhánh xuất hợp đồng:
          </Text>
          <Radio.Group
            value={selectedBranchToPrint}
            onChange={(e) => setSelectedBranchToPrint(e.target.value)}
            style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}
          >
            <Radio value="Chi nhánh 1"><strong>Chi nhánh 1</strong></Radio>
            <Radio value="Chi nhánh 2"><strong>Chi nhánh 2</strong></Radio>
          </Radio.Group>
        </div>
      </Modal>

      {/* ⚡ MODAL THÊM / SỬA KHÁCH HÀNG (ĐÃ THÊM Ô TRẢ TRƯỚC VÀ GHI CHÚ) */}
      <Modal
        title={editingCustomer ? `Sửa thông tin #${editingCustomer.id}` : 'Thêm Mới Khách Hàng'}
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        footer={null}
        destroyOnClose
        width="95%"
        style={{ maxWidth: '650px' }}
      >
        <Form form={form} layout="vertical" onFinish={handleFormSubmit} style={{ marginTop: 16 }}>
          <Form.Item name="fullName" label="Tên khách hàng" rules={[{ required: true, message: 'Vui lòng nhập tên!' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="phone" label="Số điện thoại" rules={[{ required: true, message: 'Vui lòng nhập SĐT!' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="address" label="Địa chỉ">
            <Input placeholder="Nhập địa chỉ..." />
          </Form.Item>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <Form.Item name="idCardNumber" label="Căn cước công dân (CCCD)">
              <Input placeholder="Nhập số CCCD..." />
            </Form.Item>
            <Form.Item name="idCardIssueDate" label="Ngày cấp CCCD">
              <Input placeholder="Vd: 15/05/2022" />
            </Form.Item>
          </div>

          <Form.Item name="email" label="Email">
            <Input placeholder="Nhập email khách hàng..." />
          </Form.Item>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <Form.Item name="brand" label="Hãng xe">
              <Input />
            </Form.Item>
            <Form.Item name="model" label="Model xe">
              <Input />
            </Form.Item>
          </div>

          <Form.Item name="color" label="Màu xe">
            <Input placeholder="Nhập màu xe (vd: Xám bóng, Trắng đen...)" />
          </Form.Item>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <Form.Item name="frameNumber" label="Số Khung">
              <Input placeholder="Nhập số khung..." />
            </Form.Item>
            <Form.Item name="batteryNumber" label="Số Máy / Acquy">
              <Input placeholder="Nhập số máy hoặc số acquy..." />
            </Form.Item>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <Form.Item name="price" label="Giá bán (VNĐ)">
              <InputNumber
                style={{ width: '100%' }}
                formatter={(val) => `${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}
                parser={(val) => val?.replace(/\./g, '') as unknown as number}
              />
            </Form.Item>
            
            {/* ⚡ Ô NHẬP SỐ TIỀN TRẢ TRƯỚC */}
            <Form.Item name="prepaidAmount" label="Số tiền trả trước (VNĐ)">
              <InputNumber
                style={{ width: '100%' }}
                formatter={(val) => `${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}
                parser={(val) => val?.replace(/\./g, '') as unknown as number}
                placeholder="0"
              />
            </Form.Item>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <Form.Item name="installmentBank" label="Ngân hàng góp">
              <Input placeholder="Vd: FE Credit, HD Saison..." />
            </Form.Item>
            <Form.Item name="debtAmount" label="Số tiền còn nợ (VNĐ)">
              <InputNumber
                style={{ width: '100%' }}
                formatter={(val) => `${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}
                parser={(val) => val?.replace(/\./g, '') as unknown as number}
              />
            </Form.Item>
          </div>
          <Form.Item name="promotion" label="Ưu đãi / Quà tặng">
            <Input placeholder="Vd: Tặng mũ bảo hiểm, Áo mưa, Giảm 500k..." />
          </Form.Item>
          {/* ⚡ Ô NHẬP GHI CHÚ */}
          <Form.Item name="note" label="Ghi chú">
            <Input.TextArea rows={2} placeholder="Nhập ghi chú đơn hàng..." />
          </Form.Item>

          <Form.Item name="staffName" label="Nhân viên">
            <Input />
          </Form.Item>
          <Form.Item name="branchName" label="Chi nhánh">
            <Select
              options={[
                { label: 'Chi nhánh 1', value: 'Chi nhánh 1' },
                { label: 'Chi nhánh 2', value: 'Chi nhánh 2' },
                { label: 'Khách sỉ', value: 'Khách sỉ' },
              ]}
            />
          </Form.Item>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 24 }}>
            <Button onClick={() => setIsModalOpen(false)}>Hủy</Button>
            <Button type="primary" htmlType="submit" loading={submitting}>
              {editingCustomer ? 'Lưu thay đổi' : 'Tạo mới'}
            </Button>
          </div>
        </Form>
      </Modal>

      {/* Modal Xuất Excel */}
      <Modal
        title={
          <Space>
            <FilterOutlined style={{ color: '#217346' }} />
            <span>Tùy Chọn Lọc Xuất File Excel</span>
          </Space>
        }
        open={isExportModalOpen}
        onCancel={() => setIsExportModalOpen(false)}
        footer={null}
        width="95%"
        style={{ maxWidth: '500px' }}
      >
        <Form form={exportForm} layout="vertical" onFinish={handleExportExcel} style={{ marginTop: 16 }}>
          <Form.Item name="dateRange" label="Khoảng thời gian mua xe (Từ ngày -> Đến ngày)">
            <RangePicker format="DD/MM/YYYY" style={{ width: '100%' }} placeholder={['Từ ngày', 'Đến ngày']} />
          </Form.Item>

          <Form.Item name="staffName" label="Lọc theo Nhân viên">
            <Select allowClear placeholder="Tất cả nhân viên" options={staffOptions} showSearch />
          </Form.Item>

          <Form.Item name="branchName" label="Lọc theo Chi nhánh">
            <Select allowClear placeholder="Tất cả chi nhánh" options={branchOptions} showSearch />
          </Form.Item>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={() => setIsExportModalOpen(false)}>Hủy</Button>
            <Button
              type="primary"
              htmlType="submit"
              icon={<FileExcelOutlined />}
              style={{ backgroundColor: '#217346', borderColor: '#217346' }}
            >
              Tải File Excel
            </Button>
          </div>
        </Form>
      </Modal>

      {/* Modal Xem Chi Tiết Khách Hàng */}
      <CustomerDetailModal
        isOpen={isDetailModalOpen}
        customer={selectedCustomerDetail}
        onClose={() => setIsDetailModalOpen(false)}
      />
    </div>
  );
}
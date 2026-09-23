import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import {
  Card,
  Table,
  Button,
  Tag,
  Space,
  Modal,
  Form,
  Input,
  Select,
  Row,
  Col,
  Statistic,
  message,
  Tabs,
  Typography,
  Upload,
  Popconfirm,
  Alert,
  DatePicker,
} from 'antd';
import {
  SwapOutlined,
  PlusOutlined,
  ReloadOutlined,
  ShopOutlined,
  CarOutlined,
  CheckCircleOutlined,
  FileExcelOutlined,
  DownloadOutlined,
  DeleteOutlined,
  BarcodeOutlined,
  CheckSquareOutlined,
  SyncOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import * as XLSX from 'xlsx';
import { supabase } from '../supabase';
import { logActivity } from '../utils/logger';
import type { SystemAccount, Customer } from '../App';

const { Text } = Typography;
const BASE_API_URL = import.meta.env.VITE_API_URL || 'https://xemaytungphuong-backend.vercel.app/api';

// Danh sách 4 kho/chi nhánh chuẩn
export const BRANCHES = [
  'Chi nhánh 1',
  'Chi nhánh 2',
  'Kho chợ',
  'Kho lầu 4',
] as const;

export type BranchName = (typeof BRANCHES)[number];

export interface VehicleStockItem {
  id?: number;
  brand: string;
  model_type?: string;
  model: string; // Tên Xe
  color: string;
  frame_number: string;
  battery_number?: string; // Số Acquy - PIN
  supplier?: string; // Nhà Cung Cấp
  branch: string;
  status: 'in_stock' | 'sold' | 'transferring';
  imported_at?: string; // Ngày Nhập Kho
  updated_at?: string;
}

interface InventoryLogItem {
  id?: number;
  type: 'import' | 'transfer' | 'sale' | 'delete';
  brand: string;
  model: string;
  color: string;
  quantity: number;
  from_branch?: string;
  to_branch?: string;
  note?: string;
  created_by?: string;
  created_at?: string;
}

interface ExcelVehicleRow {
  brand: string;
  model_type?: string;
  model: string;
  color: string;
  frame_number: string;
  battery_number?: string;
  supplier?: string;
  branch: string;
  imported_at?: string;
  note?: string;
}

interface InventoryManagementProps {
  currentUser: SystemAccount;
  customers?: Customer[];
}

const cleanFrameStr = (str?: string): string => {
  if (!str) return '';
  return str.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().trim();
};

// Hàm chuẩn hóa tên kho về 1 trong 4 kho chuẩn
const normalizeBranchName = (rawBranch?: string): string => {
  if (!rawBranch) return 'Chi nhánh 1';
  const str = rawBranch.trim().toLowerCase();
  
  if (str.includes('chợ') || str.includes('cho') || str.includes('kho chợ') || str.includes('kho cho')) {
    return 'Kho chợ';
  }
  if (str.includes('lầu 4') || str.includes('lau 4') || str.includes('l4') || str.includes('kho lầu 4')) {
    return 'Kho lầu 4';
  }
  if (str.includes('2') || str.includes('cn2') || str.includes('chi nhánh 2')) {
    return 'Chi nhánh 2';
  }
  return 'Chi nhánh 1';
};

// Hàm hỗ trợ lấy màu Badge tương ứng cho 4 kho
const getBranchBadgeColor = (branchName: string) => {
  switch (branchName) {
    case 'Chi nhánh 1':
      return 'blue';
    case 'Chi nhánh 2':
      return 'purple';
    case 'Kho chợ':
      return 'magenta';
    case 'Kho lầu 4':
      return 'cyan';
    default:
      return 'geekblue';
  }
};

export const InventoryManagement = ({ currentUser, customers = [] }: InventoryManagementProps) => {
  const [vehicleList, setVehicleList] = useState<VehicleStockItem[]>([]);
  const [, setLogList] = useState<InventoryLogItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);

  // Mặc định chọn 'all' (Tất cả chi nhánh)
  const [filterBranch, setFilterBranch] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('in_stock');
  const [searchText, setSearchText] = useState('');

  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

  // Modals
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [isBatchTransferModalOpen, setIsBatchTransferModalOpen] = useState(false);
  const [isExcelModalOpen, setIsExcelModalOpen] = useState(false);
  const [excelPreviewData, setExcelPreviewData] = useState<ExcelVehicleRow[]>([]);

  const [submitting, setSubmitting] = useState(false);
  const [importForm] = Form.useForm();
  const [transferForm] = Form.useForm();
  const [batchTransferForm] = Form.useForm();

  const branchOptions = BRANCHES.map((b) => ({ label: b, value: b }));

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: invData, error: invError } = await supabase
        .from('Inventory')
        .select('*')
        .order('id', { ascending: false });
      
      if (!invError && invData) {
        const normalizedInv = invData.map((item) => ({
          ...item,
          branch: normalizeBranchName(item.branch),
        }));
        setVehicleList(normalizedInv);
      }

      const { data: logData, error: logError } = await supabase
        .from('InventoryLog')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      
      if (!logError && logData) {
        const normalizedLogs = logData.map((log) => ({
          ...log,
          from_branch: log.from_branch ? normalizeBranchName(log.from_branch) : undefined,
          to_branch: log.to_branch ? normalizeBranchName(log.to_branch) : undefined,
        }));
        setLogList(normalizedLogs);
      }
    } catch (err) {
      console.error(err);
      message.error('Không thể tải danh sách xe tồn kho!');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSyncSoldStatus = async (showSuccessMsg = true) => {
    setSyncing(true);
    const hide = showSuccessMsg ? message.loading('Đang quét chính xác số khung các đơn bán...', 0) : () => {};

    try {
      let allSales: Customer[] = customers;
      if (!allSales || allSales.length === 0) {
        const res = await axios.get(`${BASE_API_URL}/customers?limit=100000&pageSize=100000`);
        if (res.data && res.data.success && Array.isArray(res.data.data)) {
          allSales = res.data.data;
        } else if (Array.isArray(res.data)) {
          allSales = res.data;
        }
      }

      if (!allSales || allSales.length === 0) {
        hide();
        setSyncing(false);
        if (showSuccessMsg) message.warning('Chưa có dữ liệu đơn hàng nào!');
        return;
      }

      const soldFrameMap = new Map<string, Customer>();
      allSales.forEach((c) => {
        const raw = (c.frameNumber || c.so_khung || '').trim();
        const clean = cleanFrameStr(raw);
        if (clean && clean !== '---' && clean.length >= 5) {
          soldFrameMap.set(clean, c);
        }
      });

      const { data: stockItems, error: stockErr } = await supabase
        .from('Inventory')
        .select('*')
        .eq('status', 'in_stock');

      if (stockErr || !stockItems) {
        hide();
        setSyncing(false);
        if (showSuccessMsg) message.error('Lỗi truy vấn kho xe!');
        return;
      }

      const matchedToSold: { item: VehicleStockItem; customer: Customer }[] = [];

      stockItems.forEach((inv) => {
        const invClean = cleanFrameStr(inv.frame_number);
        if (!invClean) return;

        if (soldFrameMap.has(invClean)) {
          matchedToSold.push({ item: inv, customer: soldFrameMap.get(invClean)! });
        }
      });

      if (matchedToSold.length > 0) {
        for (const m of matchedToSold) {
          await supabase
            .from('Inventory')
            .update({
              status: 'sold',
              updated_at: new Date().toISOString(),
            })
            .eq('id', m.item.id);

          await supabase.from('InventoryLog').insert([
            {
              type: 'sale',
              brand: m.item.brand,
              model: m.item.model,
              color: m.item.color,
              quantity: 1,
              from_branch: normalizeBranchName(m.item.branch),
              note: `Đồng bộ chính xác bán xe SK: ${m.item.frame_number} cho khách ${m.customer.fullName || m.customer.ho_ten || 'Khách mua'}`,
              created_by: 'Hệ thống tự động',
            },
          ]);
        }

        const matchedFrames = matchedToSold.map((m) => m.item.frame_number).join(', ');
        await logActivity({
          actionType: 'SALE',
          description: `Đồng bộ đơn bán: Cập nhật ${matchedToSold.length} xe sang ĐÃ BÁN [${matchedFrames}]`,
          user: currentUser,
        });

        hide();
        if (showSuccessMsg) {
          message.success(`Đã cập nhật chính xác ${matchedToSold.length} xe sang ĐÃ BÁN!`);
        }
        await fetchData();
      } else {
        hide();
        if (showSuccessMsg) {
          message.info('Không có xe mới nào khớp với danh sách đơn bán.');
        }
      }
    } catch (err: any) {
      hide();
      console.error(err);
      if (showSuccessMsg) message.error('Lỗi khi đồng bộ: ' + err.message);
    } finally {
      setSyncing(false);
    }
  };

  const selectedVehicles = useMemo(() => {
    return vehicleList.filter((v) => v.id && selectedRowKeys.includes(v.id));
  }, [vehicleList, selectedRowKeys]);

  const handleToggleStatus = async (record: VehicleStockItem) => {
    const newStatus = record.status === 'in_stock' ? 'sold' : 'in_stock';
    try {
      const { error } = await supabase
        .from('Inventory')
        .update({
          status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', record.id);

      if (error) throw error;

      await logActivity({
        actionType: 'STATUS_CHANGE',
        description: `Đổi trạng thái xe [${record.frame_number}] (${record.brand} ${record.model}) sang: ${newStatus === 'in_stock' ? 'TRONG KHO' : 'ĐÃ BÁN'}`,
        user: currentUser,
      });

      message.success(`Đã đổi xe [${record.frame_number}] thành: ${newStatus === 'in_stock' ? 'TRONG KHO' : 'ĐÃ BÁN'}`);
      fetchData();
    } catch (err: any) {
      message.error('Lỗi khi đổi trạng thái: ' + err.message);
    }
  };

  const handleDeleteVehicle = async (item: VehicleStockItem) => {
    try {
      const { error } = await supabase.from('Inventory').delete().eq('id', item.id);
      if (error) throw error;

      await supabase.from('InventoryLog').insert([
        {
          type: 'delete',
          brand: item.brand,
          model: item.model,
          color: item.color,
          quantity: 1,
          from_branch: normalizeBranchName(item.branch),
          note: `Xóa xe số khung: ${item.frame_number}`,
          created_by: currentUser.fullName,
        },
      ]);

      await logActivity({
        actionType: 'DELETE',
        description: `Xóa xe số khung [${item.frame_number}] (${item.brand} ${item.model}) tại kho [${item.branch}]`,
        user: currentUser,
      });

      message.success(`Đã xóa xe số khung [${item.frame_number}] khỏi hệ thống!`);
      setSelectedRowKeys((prev) => prev.filter((key) => key !== item.id));
      fetchData();
    } catch (err: any) {
      message.error('Xóa thất bại: ' + err.message);
    }
  };

  const handleBatchDelete = async () => {
    if (selectedRowKeys.length === 0) return;
    setSubmitting(true);
    const hide = message.loading(`Đang xóa ${selectedRowKeys.length} xe đã chọn...`, 0);

    try {
      const idsToDelete = selectedRowKeys;
      const { error } = await supabase.from('Inventory').delete().in('id', idsToDelete);
      if (error) throw error;

      for (const item of selectedVehicles) {
        await supabase.from('InventoryLog').insert([
          {
            type: 'delete',
            brand: item.brand,
            model: item.model,
            color: item.color,
            quantity: 1,
            from_branch: normalizeBranchName(item.branch),
            note: `Xóa hàng loạt xe SK: ${item.frame_number}`,
            created_by: currentUser.fullName,
          },
        ]);
      }

      const frameListStr = selectedVehicles.map((v) => v.frame_number).join(', ');
      await logActivity({
        actionType: 'DELETE',
        description: `Xóa hàng loạt ${selectedVehicles.length} xe số khung: [${frameListStr}]`,
        user: currentUser,
      });

      hide();
      message.success(`Đã xóa thành công ${idsToDelete.length} xe!`);
      setSelectedRowKeys([]);
      fetchData();
    } catch (err: any) {
      hide();
      message.error('Lỗi khi xóa hàng loạt: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleBatchTransferSubmit = async (values: any) => {
    if (selectedRowKeys.length === 0) return;
    setSubmitting(true);
    const { toBranch, note } = values;
    const hide = message.loading(`Đang chuyển ${selectedRowKeys.length} xe sang ${toBranch}...`, 0);

    try {
      for (const item of selectedVehicles) {
        const fromBranch = normalizeBranchName(item.branch);
        if (fromBranch === toBranch) continue;

        await supabase
          .from('Inventory')
          .update({
            branch: toBranch,
            updated_at: new Date().toISOString(),
          })
          .eq('id', item.id);

        await supabase.from('InventoryLog').insert([
          {
            type: 'transfer',
            brand: item.brand,
            model: item.model,
            color: item.color,
            quantity: 1,
            from_branch: fromBranch,
            to_branch: toBranch,
            note: `Chuyển hàng loạt xe SK: ${item.frame_number} (${note || 'Điều chuyển lô'})`,
            created_by: currentUser.fullName,
          },
        ]);
      }

      const transferredFrames = selectedVehicles.map((v) => v.frame_number).join(', ');
      await logActivity({
        actionType: 'TRANSFER',
        description: `Luân chuyển hàng loạt ${selectedVehicles.length} xe [${transferredFrames}] sang [${toBranch}]`,
        user: currentUser,
      });

      hide();
      message.success(`Đã chuyển thành công ${selectedRowKeys.length} xe sang ${toBranch}!`);
      setIsBatchTransferModalOpen(false);
      batchTransferForm.resetFields();
      setSelectedRowKeys([]);
      fetchData();
    } catch (err: any) {
      hide();
      message.error('Lỗi khi chuyển kho hàng loạt: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownloadSampleExcel = () => {
    const sampleData = [
      {
        'Ngày Nhập': dayjs().format('YYYY-MM-DD'),
        'Hãng': 'Honda',
        'Số Loại': 'Xe tay ga',
        'Tên Xe': 'Vision',
        'Màu Xe': 'Trắng Đen',
        'Số Khung': 'RLHJK0300P123456',
        'Số Máy / Acquy': 'JK03E-0123456',
        'Nhà Cung Cấp': 'Công ty Honda Việt Nam',
        'Chi Nhánh': 'Chi nhánh 1',
        'Ghi Chú': 'Lô xe mới nhập',
      },
      {
        'Ngày Nhập': dayjs().format('YYYY-MM-DD'),
        'Hãng': 'Yamaha',
        'Số Loại': 'Xe số',
        'Tên Xe': 'Wave Alpha',
        'Màu Xe': 'Đỏ Đen',
        'Số Khung': 'RLHJC5100P654321',
        'Số Máy / Acquy': 'JC51E-0654321',
        'Nhà Cung Cấp': 'Công ty Yamaha Motor',
        'Chi Nhánh': 'Kho chợ',
        'Ghi Chú': 'Lô xe mới nhập',
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(sampleData);
    worksheet['!cols'] = [
      { wch: 14 },
      { wch: 14 },
      { wch: 16 },
      { wch: 18 },
      { wch: 15 },
      { wch: 24 },
      { wch: 20 },
      { wch: 25 },
      { wch: 15 },
      { wch: 20 },
    ];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'MauNhapXeSoKhung');
    XLSX.writeFile(workbook, 'Mau_Nhap_Xe_Theo_So_Khung.xlsx');
  };

  const handleFileSelect = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const rawJson: any[] = XLSX.utils.sheet_to_json(workbook.Sheets[firstSheetName]);

        if (rawJson.length === 0) {
          message.warning('File Excel không có dữ liệu!');
          return;
        }

        const formattedRows: ExcelVehicleRow[] = rawJson
          .map((row: any) => {
            const rawBranch = String(row['Chi Nhánh'] || row['chi_nhanh'] || currentUser.branch).trim();
            const branchName = normalizeBranchName(rawBranch);
            
            const rawImportDate = row['Ngày Nhập'] || row['ngay_nhap'] || row['imported_at'];
            const parsedDate = rawImportDate ? dayjs(rawImportDate).toISOString() : new Date().toISOString();

            return {
              brand: String(row['Hãng'] || row['Hãng Xe'] || row['hang_xe'] || '').trim(),
              model_type: String(row['Số Loại'] || row['so_loai'] || row['Loại Xe'] || row['loai_xe'] || '').trim(),
              model: String(row['Tên Xe'] || row['Model Xe'] || row['model_xe'] || row['Model'] || '').trim(),
              color: String(row['Màu Xe'] || row['Màu Sắc'] || row['mau_sac'] || row['Màu'] || 'Tiêu chuẩn').trim(),
              frame_number: String(row['Số Khung'] || row['so_khung'] || row['SK'] || '').trim(),
              battery_number: String(row['Số Máy / Acquy'] || row['Số Máy'] || row['Số Acquy - PIN'] || row['Số Acquy'] || row['So Pin'] || row['battery_number'] || '').trim(),
              supplier: String(row['Nhà Cung Cấp'] || row['nha_cung_cap'] || '').trim(),
              branch: branchName,
              imported_at: parsedDate,
              note: String(row['Ghi Chú'] || row['ghi_chu'] || 'Nhập kho Excel').trim(),
            };
          })
          .filter((item) => item.frame_number && item.brand && item.model);

        if (formattedRows.length === 0) {
          message.error('Không tìm thấy cột Số Khung, Hãng Xe, hoặc Tên Xe hợp lệ!');
          return;
        }

        const duplicateFramesInDb = formattedRows.filter((row) =>
          vehicleList.some((item) => cleanFrameStr(item.frame_number) === cleanFrameStr(row.frame_number))
        );

        if (duplicateFramesInDb.length > 0) {
          const duplicateListStr = duplicateFramesInDb.map((d) => d.frame_number).join(', ');
          Modal.confirm({
            title: '🚨 PHÁT HIỆN SỐ KHUNG TRÙNG LẶP!',
            content: (
              <div>
                <p>Trong file Excel có <strong>{duplicateFramesInDb.length}</strong> xe trùng số khung với kho hiện tại:</p>
                <div style={{ maxHeight: 150, overflowY: 'auto', background: '#fff2f0', padding: 8, borderRadius: 4, color: '#ff4d4f' }}>
                  <strong>{duplicateListStr}</strong>
                </div>
                <p style={{ marginTop: 8 }}>Bạn có muốn xem trước và đè/cập nhật danh sách này không?</p>
              </div>
            ),
            okText: 'Tiếp tục xem trước',
            cancelText: 'Hủy nhập file',
            onOk: () => {
              setExcelPreviewData(formattedRows);
              setIsExcelModalOpen(true);
            },
          });
        } else {
          setExcelPreviewData(formattedRows);
          setIsExcelModalOpen(true);
        }
      } catch {
        message.error('Định dạng file Excel không hợp lệ!');
      }
    };
    reader.readAsArrayBuffer(file);
    return false;
  };

  const handleConfirmImportExcel = async () => {
    if (excelPreviewData.length === 0) return;
    setSubmitting(true);
    const hide = message.loading('Đang lưu danh sách xe vào kho...', 0);

    try {
      for (const row of excelPreviewData) {
        const branchName = normalizeBranchName(row.branch);

        const { data: existing } = await supabase
          .from('Inventory')
          .select('id')
          .eq('frame_number', row.frame_number)
          .maybeSingle();

        if (existing) {
          await supabase
            .from('Inventory')
            .update({
              brand: row.brand,
              model_type: row.model_type,
              model: row.model,
              color: row.color,
              battery_number: row.battery_number,
              supplier: row.supplier,
              branch: branchName,
              imported_at: row.imported_at,
              status: 'in_stock',
              updated_at: new Date().toISOString(),
            })
            .eq('id', existing.id);
        } else {
          await supabase.from('Inventory').insert([
            {
              brand: row.brand,
              model_type: row.model_type,
              model: row.model,
              color: row.color,
              frame_number: row.frame_number,
              battery_number: row.battery_number,
              supplier: row.supplier,
              branch: branchName,
              imported_at: row.imported_at,
              status: 'in_stock',
            },
          ]);
        }

        await supabase.from('InventoryLog').insert([
          {
            type: 'import',
            brand: row.brand,
            model: row.model,
            color: row.color,
            quantity: 1,
            to_branch: branchName,
            note: `Nhập xe SK: ${row.frame_number} (${row.note})`,
            created_by: currentUser.fullName,
          },
        ]);
      }

      await logActivity({
        actionType: 'IMPORT',
        description: `Nhập kho bằng Excel: Nạp thành công ${excelPreviewData.length} xe vào hệ thống`,
        user: currentUser,
      });

      hide();
      message.success(`Đã nạp thành công ${excelPreviewData.length} xe theo số khung vào kho!`);
      setIsExcelModalOpen(false);
      setExcelPreviewData([]);
      await fetchData();
    } catch (err: any) {
      hide();
      message.error('Lỗi khi lưu dữ liệu: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleImportSubmit = async (values: any) => {
    const cleanInputVin = cleanFrameStr(values.frame_number);

    const existingInState = vehicleList.find(
      (item) => cleanFrameStr(item.frame_number) === cleanInputVin
    );

    if (existingInState) {
      Modal.confirm({
        title: '🚨 CẢNH BÁO: SỐ KHUNG ĐÃ TỒN TẠI!',
        content: (
          <div>
            <p>Số khung <strong>{(values.frame_number || '').toUpperCase()}</strong> đã có sẵn trong hệ thống:</p>
            <ul>
              <li><strong>Xe:</strong> {existingInState.brand} {existingInState.model}</li>
              <li><strong>Chi nhánh / Kho:</strong> {existingInState.branch}</li>
              <li><strong>Trạng thái:</strong> {existingInState.status === 'in_stock' ? 'Trong kho' : 'Đã bán'}</li>
            </ul>
            <p>Bạn có chắc chắn vẫn muốn ghi đè / tạo mới xe này không?</p>
          </div>
        ),
        okText: 'Vẫn tiếp tục nhập',
        cancelText: 'Hủy để kiểm tra',
        onOk: () => processImportVehicle(values),
      });
      return;
    }

    await processImportVehicle(values);
  };

  const processImportVehicle = async (values: any) => {
    setSubmitting(true);
    const { brand, model_type, model, color, frame_number, battery_number, supplier, branch, imported_at, note } = values;
    const targetBranch = normalizeBranchName(branch);
    const formattedImportedAt = imported_at ? imported_at.toISOString() : new Date().toISOString();

    try {
      const { data: existing } = await supabase
        .from('Inventory')
        .select('id')
        .eq('frame_number', frame_number.trim())
        .maybeSingle();

      if (existing) {
        await supabase
          .from('Inventory')
          .update({
            brand: brand.trim(),
            model_type: (model_type || '').trim(),
            model: model.trim(),
            color: color.trim(),
            battery_number: (battery_number || '').trim(),
            supplier: (supplier || '').trim(),
            branch: targetBranch,
            imported_at: formattedImportedAt,
            status: 'in_stock',
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id);
      } else {
        await supabase.from('Inventory').insert([
          {
            brand: brand.trim(),
            model_type: (model_type || '').trim(),
            model: model.trim(),
            color: color.trim(),
            frame_number: frame_number.trim(),
            battery_number: (battery_number || '').trim(),
            supplier: (supplier || '').trim(),
            branch: targetBranch,
            imported_at: formattedImportedAt,
            status: 'in_stock',
          },
        ]);
      }

      await supabase.from('InventoryLog').insert([
        {
          type: 'import',
          brand: brand.trim(),
          model: model.trim(),
          color: color.trim(),
          quantity: 1,
          to_branch: targetBranch,
          note: `Nhập xe SK: ${frame_number} - ${note || 'Nhập thủ công'}`,
          created_by: currentUser.fullName,
        },
      ]);

      await logActivity({
        actionType: 'IMPORT',
        description: `Nhập xe mới thủ công: [${frame_number}] (${brand} ${model}, màu ${color}) vào [${targetBranch}]`,
        user: currentUser,
      });

      message.success(`Đã thêm xe ${brand} ${model} (SK: ${frame_number}) vào ${targetBranch}!`);
      setIsImportModalOpen(false);
      importForm.resetFields();
      await fetchData();
    } catch (err: any) {
      message.error('Lỗi khi thêm xe: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleTransferSubmit = async (values: any) => {
    setSubmitting(true);
    const { frame_number, toBranch, note } = values;
    const targetBranch = normalizeBranchName(toBranch);

    try {
      const { data: item } = await supabase
        .from('Inventory')
        .select('*')
        .eq('frame_number', frame_number)
        .maybeSingle();

      if (!item) {
        message.error('Không tìm thấy xe với số khung này!');
        setSubmitting(false);
        return;
      }

      const fromBranch = normalizeBranchName(item.branch);

      if (fromBranch === targetBranch) {
        message.warning('Kho / Chi nhánh nhận phải khác kho hiện tại của xe!');
        setSubmitting(false);
        return;
      }

      await supabase
        .from('Inventory')
        .update({
          branch: targetBranch,
          updated_at: new Date().toISOString(),
        })
        .eq('id', item.id);

      await supabase.from('InventoryLog').insert([
        {
          type: 'transfer',
          brand: item.brand,
          model: item.model,
          color: item.color,
          quantity: 1,
          from_branch: fromBranch,
          to_branch: targetBranch,
          note: `Chuyển xe SK: ${frame_number} (${note || 'Điều tiết kho'})`,
          created_by: currentUser.fullName,
        },
      ]);

      await logActivity({
        actionType: 'TRANSFER',
        description: `Luân chuyển xe [${frame_number}] (${item.brand} ${item.model}) từ [${fromBranch}] sang [${targetBranch}]`,
        user: currentUser,
      });

      message.success(`Đã chuyển xe số khung [${frame_number}] từ ${fromBranch} sang ${targetBranch}!`);
      setIsTransferModalOpen(false);
      transferForm.resetFields();
      fetchData();
    } catch (err: any) {
      message.error('Lỗi khi luân chuyển: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredVehicles = useMemo(() => {
    return vehicleList.filter((item) => {
      const itemBranch = normalizeBranchName(item.branch);
      const matchBranch = filterBranch === 'all' ? true : itemBranch === filterBranch;
      const matchStatus = filterStatus === 'all' ? true : item.status === filterStatus;
      const search = searchText.toLowerCase();
      const matchSearch =
        item.frame_number.toLowerCase().includes(search) ||
        (item.model_type && item.model_type.toLowerCase().includes(search)) ||
        (item.battery_number && item.battery_number.toLowerCase().includes(search)) ||
        (item.supplier && item.supplier.toLowerCase().includes(search)) ||
        item.brand.toLowerCase().includes(search) ||
        item.model.toLowerCase().includes(search) ||
        item.color.toLowerCase().includes(search) ||
        itemBranch.toLowerCase().includes(search);
      return matchBranch && matchStatus && matchSearch;
    });
  }, [vehicleList, filterBranch, filterStatus, searchText]);

  const inStockCount = vehicleList.filter((v) => v.status === 'in_stock').length;
  const soldCount = vehicleList.filter((v) => v.status === 'sold').length;

  const rowSelection = {
    selectedRowKeys,
    onChange: (newSelectedRowKeys: React.Key[]) => {
      setSelectedRowKeys(newSelectedRowKeys);
    },
  };

  return (
    <div style={{ paddingTop: 8 }}>
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={8}>
          <Card bordered style={{ borderRadius: 8, backgroundColor: '#e6f7ff', borderColor: '#91caff' }}>
            <Statistic
              title={<span style={{ color: '#0958d9', fontWeight: 600 }}>Xe Đang Tồn Trong Kho</span>}
              value={inStockCount}
              suffix="chiếc"
              prefix={<CarOutlined style={{ color: '#1677ff' }} />}
              valueStyle={{ color: '#1677ff', fontWeight: 700 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card bordered style={{ borderRadius: 8, backgroundColor: '#f6ffed', borderColor: '#b7eb8f' }}>
            <Statistic
              title={<span style={{ color: '#389e0d', fontWeight: 600 }}>Tổng Xe Đã Xuất Bán</span>}
              value={soldCount}
              suffix="chiếc"
              prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
              valueStyle={{ color: '#52c41a', fontWeight: 700 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card bordered style={{ borderRadius: 8, backgroundColor: '#fff7e6', borderColor: '#ffd591' }}>
            <Statistic
              title={<span style={{ color: '#d46b08', fontWeight: 600 }}>Chi Nhánh / Kho Đang Quản Lý</span>}
              value={4}
              suffix="kho/shop"
              prefix={<ShopOutlined style={{ color: '#fa8c16' }} />}
              valueStyle={{ color: '#fa8c16', fontWeight: 700 }}
            />
          </Card>
        </Col>
      </Row>

      <Tabs
        type="card"
        items={[
          {
            key: 'stock',
            label: (
              <span>
                <BarcodeOutlined /> Quản Lý Xe Theo Số Khung ({filteredVehicles.length})
              </span>
            ),
            children: (
              <Card size="small" style={{ borderRadius: 8 }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: 12, marginBottom: 16 }}>
                  <Space wrap>
                    <Select
                      value={filterBranch}
                      onChange={setFilterBranch}
                      style={{ width: 180 }}
                      options={[
                        { label: '🏪 Tất cả chi nhánh / kho', value: 'all' },
                        ...branchOptions,
                      ]}
                    />

                    <Select
                      value={filterStatus}
                      onChange={setFilterStatus}
                      style={{ width: 150 }}
                      options={[
                        { label: '📦 Đang tồn kho', value: 'in_stock' },
                        { label: '✅ Đã bán', value: 'sold' },
                        { label: 'Tất cả trạng thái', value: 'all' },
                      ]}
                    />

                    <Input
                      placeholder="Tìm số khung, số loại, nhà cung cấp..."
                      value={searchText}
                      onChange={(e) => setSearchText(e.target.value)}
                      style={{ width: 240 }}
                      allowClear
                    />
                    <Button icon={<ReloadOutlined />} onClick={fetchData} loading={loading}>
                      Tải lại
                    </Button>
                    <Button
                      type="primary"
                      icon={<SyncOutlined spin={syncing} />}
                      style={{ backgroundColor: '#1890ff' }}
                      onClick={() => handleSyncSoldStatus(true)}
                      loading={syncing}
                    >
                      Đồng Bộ Đơn Đã Bán
                    </Button>
                  </Space>

                  <Space wrap>
                    <Button icon={<DownloadOutlined />} onClick={handleDownloadSampleExcel}>
                      Tải Mẫu Excel Số Khung
                    </Button>

                    <Upload beforeUpload={handleFileSelect} showUploadList={false} accept=".xlsx, .xls">
                      <Button type="primary" style={{ backgroundColor: '#13c2c2', borderColor: '#13c2c2' }} icon={<FileExcelOutlined />}>
                        Nhập Lô Xe Bằng Excel
                      </Button>
                    </Upload>

                    <Button
                      type="primary"
                      style={{ backgroundColor: '#52c41a', borderColor: '#52c41a' }}
                      icon={<PlusOutlined />}
                      onClick={() => {
                        importForm.resetFields();
                        importForm.setFieldsValue({
                          branch: normalizeBranchName(currentUser.branch),
                          imported_at: dayjs(),
                        });
                        setIsImportModalOpen(true);
                      }}
                    >
                      Nhập Xe Thủ Công
                    </Button>

                    <Button
                      type="primary"
                      style={{ backgroundColor: '#722ed1', borderColor: '#722ed1' }}
                      icon={<SwapOutlined />}
                      onClick={() => {
                        transferForm.resetFields();
                        setIsTransferModalOpen(true);
                      }}
                    >
                      Chuyển 1 Xe Cụ Thể
                    </Button>
                  </Space>
                </div>

                {selectedRowKeys.length > 0 && (
                  <Alert
                    style={{ marginBottom: 16, borderRadius: 8 }}
                    message={
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                        <Space>
                          <CheckSquareOutlined style={{ color: '#1677ff', fontSize: 18 }} />
                          <span>
                            Đã chọn <strong>{selectedRowKeys.length}</strong> xe trong danh sách
                          </span>
                          <Button size="small" type="link" onClick={() => setSelectedRowKeys([])}>
                            Bỏ chọn tất cả
                          </Button>
                        </Space>
                        <Space wrap>
                          <Button
                            type="primary"
                            icon={<SwapOutlined />}
                            style={{ backgroundColor: '#722ed1', borderColor: '#722ed1' }}
                            onClick={() => {
                              batchTransferForm.resetFields();
                              setIsBatchTransferModalOpen(true);
                            }}
                          >
                            Luân Chuyển {selectedRowKeys.length} Xe Đã Chọn
                          </Button>

                          <Popconfirm
                            title="Xác nhận xóa hàng loạt"
                            description={`Bạn có chắc chắn muốn xóa ${selectedRowKeys.length} xe đã chọn khỏi hệ thống?`}
                            onConfirm={handleBatchDelete}
                            okText="Xóa Tất Cả"
                            cancelText="Hủy"
                            okButtonProps={{ danger: true }}
                          >
                            <Button danger icon={<DeleteOutlined />}>
                              Xóa {selectedRowKeys.length} Xe Đã Chọn
                            </Button>
                          </Popconfirm>
                        </Space>
                      </div>
                    }
                    type="info"
                    showIcon={false}
                  />
                )}

                <Table<VehicleStockItem>
                  rowSelection={rowSelection}
                  dataSource={filteredVehicles}
                  rowKey="id"
                  loading={loading}
                  pagination={{ pageSize: 10, showSizeChanger: false }}
                  size="middle"
                  columns={[
                    {
                      title: 'NGÀY NHẬP',
                      dataIndex: 'imported_at',
                      key: 'imported_at',
                      render: (d) => (d ? dayjs(d).format('DD/MM/YYYY') : '--/--/----'),
                      width: 110,
                    },
                    {
                      title: 'SỐ KHUNG (VIN)',
                      dataIndex: 'frame_number',
                      key: 'frame_number',
                      render: (sk) => <Text code style={{ color: '#d46b08', fontWeight: 700, fontSize: 13 }}>{sk}</Text>,
                      width: 170,
                    },
                    {
                      title: 'SỐ LOẠI',
                      dataIndex: 'model_type',
                      key: 'model_type',
                      render: (val) => val ? <Text style={{ fontWeight: 500 }}>{val}</Text> : <Text type="secondary" italic>--</Text>,
                      width: 120,
                    },
                    {
                      title: 'HÃNG & TÊN XE',
                      key: 'model',
                      render: (_, record) => (
                        <Space direction="vertical" size={0}>
                          <Text strong>{record.brand} {record.model}</Text>
                        </Space>
                      ),
                    },
                    {
                      title: 'MÀU XE',
                      dataIndex: 'color',
                      key: 'color',
                      render: (color) => <Tag color="blue">{color}</Tag>,
                      width: 110,
                    },
                    {
                      title: 'SỐ MÁY / ACQUY',
                      dataIndex: 'battery_number',
                      key: 'battery_number',
                      render: (bat) => bat ? <Text style={{ color: '#108ee9' }}>{bat}</Text> : <Text type="secondary" italic>--</Text>,
                      width: 130,
                    },
                    {
                      title: 'NHÀ CUNG CẤP',
                      dataIndex: 'supplier',
                      key: 'supplier',
                      render: (sup) => sup ? <Text>{sup}</Text> : <Text type="secondary" italic>--</Text>,
                      width: 140,
                    },
                    {
                      title: 'VỊ TRÍ KHO',
                      dataIndex: 'branch',
                      key: 'branch',
                      render: (b) => {
                        const branchName = normalizeBranchName(b);
                        return <Tag color={getBranchBadgeColor(branchName)}>{branchName}</Tag>;
                      },
                      width: 120,
                    },
                    {
                      title: 'TRẠNG THÁI',
                      dataIndex: 'status',
                      key: 'status',
                      render: (st) => (
                        st === 'in_stock' ? (
                          <Tag color="success">Trong Kho</Tag>
                        ) : st === 'sold' ? (
                          <Tag color="default">Đã Bán</Tag>
                        ) : (
                          <Tag color="warning">Luân Chuyển</Tag>
                        )
                      ),
                      width: 110,
                    },
                    {
                      title: 'THAO TÁC',
                      key: 'action',
                      render: (_, record) => (
                        <Space>
                          <Button
                            size="small"
                            type={record.status === 'in_stock' ? 'default' : 'primary'}
                            onClick={() => handleToggleStatus(record)}
                          >
                            {record.status === 'in_stock' ? 'Đổi: Đã Bán' : 'Đổi: Trong Kho'}
                          </Button>

                          <Popconfirm
                            title="Xác nhận xóa xe"
                            description={`Bạn có chắc chắn muốn xóa xe số khung [${record.frame_number}]?`}
                            onConfirm={() => handleDeleteVehicle(record)}
                            okText="Xóa"
                            cancelText="Hủy"
                            okButtonProps={{ danger: true }}
                          >
                            <Button size="small" danger icon={<DeleteOutlined />} />
                          </Popconfirm>
                        </Space>
                      ),
                      width: 150,
                    },
                  ]}
                />
              </Card>
            ),
          },
        ]}
      />

      {/* Modal Nhập xe thủ công - ĐÃ THÊM Ô CHỌN NGÀY NHẬP */}
      <Modal
        title="Nhập Xe Mới Thủ Công"
        open={isImportModalOpen}
        onCancel={() => setIsImportModalOpen(false)}
        onOk={() => importForm.submit()}
        confirmLoading={submitting}
        okText="Lưu Vào Kho"
        cancelText="Hủy"
      >
        <Form form={importForm} layout="vertical" onFinish={handleImportSubmit}>
          {/* Ô chọn ngày nhập */}
          <Form.Item name="imported_at" label="Ngày Nhập Kho" rules={[{ required: true, message: 'Vui lòng chọn ngày nhập!' }]}>
            <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" placeholder="Chọn ngày nhập kho" />
          </Form.Item>

          {/* 1. Hãng */}
          <Form.Item name="brand" label="Hãng" rules={[{ required: true, message: 'Nhập hãng xe!' }]}>
            <Input placeholder="Ví dụ: Honda, Yamaha, Suzuki, SYM..." />
          </Form.Item>

          {/* 2. Số Loại */}
          <Form.Item name="model_type" label="Số Loại">
            <Input placeholder="Ví dụ: Xe tay ga, Xe số, Xe côn tay..." />
          </Form.Item>

          {/* 3. Tên Xe */}
          <Form.Item name="model" label="Tên Xe" rules={[{ required: true, message: 'Nhập tên xe / model!' }]}>
            <Input placeholder="Ví dụ: Vision, Wave Alpha, Air Blade, Exciter..." />
          </Form.Item>

          {/* 4. Màu Xe */}
          <Form.Item name="color" label="Màu Xe" rules={[{ required: true, message: 'Nhập màu xe!' }]}>
            <Input placeholder="Ví dụ: Trắng, Đỏ, Xám bóng, Đen nhám..." />
          </Form.Item>

          {/* 5. Số Khung */}
          <Form.Item name="frame_number" label="Số Khung" rules={[{ required: true, message: 'Nhập số khung!' }]}>
            <Input placeholder="Nhập chính xác số khung xe (VIN)..." />
          </Form.Item>

          {/* 6. Số Máy / Acquy */}
          <Form.Item name="battery_number" label="Số Máy / Acquy">
            <Input placeholder="Ví dụ: JK03E-0123456 hoặc số acquy..." />
          </Form.Item>

          {/* 7. Nhà Cung Cấp */}
          <Form.Item name="supplier" label="Nhà Cung Cấp">
            <Input placeholder="Ví dụ: Công ty Yadea Việt Nam..." />
          </Form.Item>

          {/* Cột Vị trí kho & Ghi chú */}
          <Form.Item name="branch" label="Vị Trí Kho / Chi Nhánh" rules={[{ required: true, message: 'Vui lòng chọn kho!' }]}>
            <Select options={branchOptions} />
          </Form.Item>

          <Form.Item name="note" label="Ghi Chú">
            <Input.TextArea rows={2} placeholder="Ghi chú bổ sung..." />
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal Chuyển 1 xe */}
      <Modal
        title="Chuyển 1 Xe Sang Kho / Chi Nhánh Khác"
        open={isTransferModalOpen}
        onCancel={() => setIsTransferModalOpen(false)}
        onOk={() => transferForm.submit()}
        confirmLoading={submitting}
        okText="Chuyển Kho"
        cancelText="Hủy"
      >
        <Form form={transferForm} layout="vertical" onFinish={handleTransferSubmit}>
          <Form.Item name="frame_number" label="Số Khung Xe Cần Chuyển" rules={[{ required: true, message: 'Nhập số khung xe!' }]}>
            <Input placeholder="Nhập số khung xe đang có trong kho..." />
          </Form.Item>
          <Form.Item name="toBranch" label="Kho / Chi Nhánh Nhận Xe" rules={[{ required: true, message: 'Chọn kho đích!' }]}>
            <Select options={branchOptions} />
          </Form.Item>
          <Form.Item name="note" label="Lý Do / Ghi Chú">
            <Input.TextArea rows={2} placeholder="Lý do chuyển kho..." />
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal Chuyển xe hàng loạt */}
      <Modal
        title={`Chuyển Kho Hàng Loạt (${selectedRowKeys.length} Xe)`}
        open={isBatchTransferModalOpen}
        onCancel={() => setIsBatchTransferModalOpen(false)}
        onOk={() => batchTransferForm.submit()}
        confirmLoading={submitting}
        okText="Xác Nhận Chuyển Tất Cả"
        cancelText="Hủy"
      >
        <Form form={batchTransferForm} layout="vertical" onFinish={handleBatchTransferSubmit}>
          <Form.Item name="toBranch" label="Kho / Chi Nhánh Đích Nhận Xe" rules={[{ required: true, message: 'Vui lòng chọn kho đích!' }]}>
            <Select options={branchOptions} />
          </Form.Item>
          <Form.Item name="note" label="Ghi Chú Luân Chuyển">
            <Input.TextArea rows={2} placeholder="Nhập ghi chú cho đợt chuyển lô này..." />
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal Xem trước file Excel */}
      <Modal
        title={`Xác Nhận Nhập Lô Xe Tồn Kho Từ Excel (${excelPreviewData.length} chiếc)`}
        open={isExcelModalOpen}
        onCancel={() => setIsExcelModalOpen(false)}
        onOk={handleConfirmImportExcel}
        confirmLoading={submitting}
        okText="Xác Nhận Nạp Kho"
        cancelText="Hủy"
        width={980}
      >
        <Table<ExcelVehicleRow>
          dataSource={excelPreviewData}
          rowKey={(r) => r.frame_number}
          pagination={{ pageSize: 5 }}
          size="small"
          columns={[
            {
              title: 'Ngày Nhập',
              dataIndex: 'imported_at',
              key: 'imported_at',
              render: (d) => (d ? dayjs(d).format('DD/MM/YYYY') : '--/--/----'),
            },
            { title: 'Hãng', dataIndex: 'brand', key: 'brand' },
            { title: 'Số Loại', dataIndex: 'model_type', key: 'model_type', render: (val) => val || '--' },
            { title: 'Tên Xe', dataIndex: 'model', key: 'model' },
            { title: 'Màu Xe', dataIndex: 'color', key: 'color' },
            { title: 'Số Khung', dataIndex: 'frame_number', key: 'frame_number' },
            { title: 'Số Acquy - PIN', dataIndex: 'battery_number', key: 'battery_number', render: (val) => val || '--' },
            { title: 'Nhà Cung Cấp', dataIndex: 'supplier', key: 'supplier', render: (val) => val || '--' },
            { 
              title: 'Vị Trí Kho', 
              dataIndex: 'branch', 
              key: 'branch', 
              render: (b) => {
                const branchName = normalizeBranchName(b);
                return <Tag color={getBranchBadgeColor(branchName)}>{branchName}</Tag>;
              } 
            },
          ]}
        />
      </Modal>
    </div>
  );
};
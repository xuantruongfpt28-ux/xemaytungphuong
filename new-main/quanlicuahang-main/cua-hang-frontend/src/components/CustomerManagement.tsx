import { useState, useEffect, useMemo, type ChangeEvent } from 'react';
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
} from '@ant-design/icons';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import { printContractDirectly, type Customer } from './ContractPrint';

dayjs.extend(customParseFormat);

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

const BASE_API_URL = import.meta.env.VITE_API_URL || 'https://xemaytungphuong-backend.vercel.app/api';

export default function CustomerManagement() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [searchText, setSearchText] = useState<string>('');

  // State Modal Thêm/Sửa
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);

  // State Modal Xuất Excel
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);
  const [exportForm] = Form.useForm();
  const [form] = Form.useForm();

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${BASE_API_URL}/customers`);
      if (response.data && response.data.success) {
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
    fetchCustomers();
  }, []);

  // Lọc danh sách nhân viên duy nhất
  const staffOptions = useMemo(() => {
    const staffSet = new Set<string>();
    customers.forEach((c) => {
      if (c.staffName && c.staffName.trim()) staffSet.add(c.staffName.trim());
    });
    return Array.from(staffSet).map((name) => ({ label: name, value: name }));
  }, [customers]);

  // Lọc danh sách chi nhánh duy nhất
  const branchOptions = useMemo(() => {
    const branchSet = new Set<string>();
    customers.forEach((c) => {
      if (c.branchName && c.branchName.trim()) branchSet.add(c.branchName.trim());
    });
    return Array.from(branchSet).map((name) => ({ label: name, value: name }));
  }, [customers]);

  const handleOpenAddModal = () => {
    setEditingCustomer(null);
    form.resetFields();
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (record: Customer) => {
    setEditingCustomer(record);
    const nameParts = (record.vehicleName || '').split(' ');
    const brand = record.brand || nameParts[0] || '';
    const model = record.model || nameParts.slice(1).join(' ') || '';

    form.setFieldsValue({
      fullName: record.fullName || record.ho_ten || '',
      phone: record.phone || record.dien_thoai || '',
      address: record.address || record.dia_chi || '',
      brand,
      model,
      color: record.color || record.mau || '',
      price: record.price ? Number(record.price) : 0,
      staffName: record.staffName || '',
      branchName: record.branchName || '',
      frameNumber: record.frameNumber || record.so_khung || '',
      batteryNumber: record.batteryNumber || record.so_pin || '',
    });
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (values: any) => {
    setSubmitting(true);
    try {
      if (editingCustomer && editingCustomer.id) {
        await axios.put(`${BASE_API_URL}/customers/${editingCustomer.id}`, values);
        message.success('Cập nhật thành công!');
      } else {
        await axios.post(`${BASE_API_URL}/customers`, values);
        message.success('Thêm mới thành công!');
      }
      setIsModalOpen(false);
      form.resetFields();
      fetchCustomers();
    } catch (error) {
      message.error('Lưu dữ liệu thất bại!');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id?: number) => {
    if (!id) return;
    try {
      await axios.delete(`${BASE_API_URL}/customers/${id}`);
      message.success('Đã xóa thành công!');
      fetchCustomers();
    } catch (error) {
      message.error('Xóa thất bại!');
    }
  };

  // Nút In hợp đồng: Gọi trực tiếp printContractDirectly độc lập
  const handlePrint = (record: Customer) => {
    printContractDirectly(record);
  };

  // Xuất file Excel
  const handleExportExcel = (values: any) => {
    const { dateRange, staffName, branchName } = values;
    let filtered = [...customers];

    if (dateRange && dateRange[0] && dateRange[1]) {
      const startDate = dateRange[0].startOf('day');
      const endDate = dateRange[1].endOf('day');

      filtered = filtered.filter((item) => {
        const rawTime = item.formTimestamp || item.createdAt;
        if (!rawTime) return false;

        let itemDate: dayjs.Dayjs | null = null;
        if (rawTime.includes('/')) {
          const datePart = rawTime.split(' ')[0];
          itemDate = dayjs(datePart, 'DD/MM/YYYY');
        } else {
          itemDate = dayjs(rawTime);
        }

        if (!itemDate || !itemDate.isValid()) return false;
        return (
          (itemDate.isAfter(startDate) || itemDate.isSame(startDate)) &&
          (itemDate.isBefore(endDate) || itemDate.isSame(endDate))
        );
      });
    }

    if (staffName) filtered = filtered.filter((item) => item.staffName === staffName);
    if (branchName) filtered = filtered.filter((item) => item.branchName === branchName);

    if (filtered.length === 0) {
      message.warning('Không tìm thấy dữ liệu phù hợp với bộ lọc!');
      return;
    }

    const excelData = filtered.map((item, index) => ({
      'STT': index + 1,
      'ID Đơn': `#${item.id || index + 1}`,
      'Thời Gian Mua': item.formTimestamp || (item.createdAt ? dayjs(item.createdAt).format('DD/MM/YYYY') : '---'),
      'Khách Hàng': item.fullName || item.ho_ten || '---',
      'Số Điện Thoại': item.phone || item.dien_thoai || '---',
      'Địa Chỉ': item.address || item.dia_chi || '---',
      'Tên Xe / Hãng': item.vehicleName || [item.brand, item.model].filter(Boolean).join(' ') || item.model || '---',
      'Màu Sắc': item.color || item.mau || '---',
      'Số Khung': item.frameNumber || item.so_khung || '---',
      'Số Máy / Acquy': item.batteryNumber || item.so_pin || '---',
      'Giá Bán (VNĐ)': item.price ? Number(item.price).toLocaleString('vi-VN') : '0',
      'Nhân Viên': item.staffName || '---',
      'Chi Nhánh': item.branchName || '---',
    }));

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    worksheet['!cols'] = [
      { wch: 6 }, { wch: 10 }, { wch: 16 }, { wch: 25 }, { wch: 15 },
      { wch: 40 }, { wch: 25 }, { wch: 15 }, { wch: 20 }, { wch: 20 },
      { wch: 18 }, { wch: 20 }, { wch: 18 },
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'DanhSachKhachHang');
    XLSX.writeFile(workbook, `Danh_Sach_Khach_Hang_${dayjs().format('DDMMYYYY_HHmmss')}.xlsx`);

    message.success(`Đã xuất thành công ${filtered.length} dòng dữ liệu sang Excel!`);
    setIsExportModalOpen(false);
  };

  const filteredCustomers = customers.filter((item) => {
    const searchLower = searchText.toLowerCase();
    const fullVehicleName = item.vehicleName || [item.brand, item.model].filter(Boolean).join(' ') || item.model || '';
    const name = item.fullName || item.ho_ten || '';
    const phone = item.phone || item.dien_thoai || '';
    const address = item.address || item.dia_chi || '';
    const color = item.color || item.mau || '';
    const frameNumber = item.frameNumber || item.so_khung || '';
    const batteryNumber = item.batteryNumber || item.so_pin || '';

    return (
      name.toLowerCase().includes(searchLower) ||
      phone.includes(searchLower) ||
      address.toLowerCase().includes(searchLower) ||
      color.toLowerCase().includes(searchLower) ||
      fullVehicleName.toLowerCase().includes(searchLower) ||
      frameNumber.toLowerCase().includes(searchLower) ||
      batteryNumber.toLowerCase().includes(searchLower) ||
      (item.branchName && item.branchName.toLowerCase().includes(searchLower))
    );
  });

  const columns: ColumnsType<Customer> = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      render: (id?: number) => <Text type="secondary">#{id || '---'}</Text>,
      width: 60,
    },
    {
      title: 'THỜI GIAN MUA',
      dataIndex: 'formTimestamp',
      key: 'formTimestamp',
      render: (time?: string, record?: Customer) => {
        const rawTime = time || record?.createdAt;
        if (!rawTime) return <Text style={{ fontSize: '13px', color: '#595959' }}>---</Text>;

        let formattedDate = rawTime;
        const dateObj = new Date(rawTime);

        if (!isNaN(dateObj.getTime()) && rawTime.includes('GMT')) {
          const day = String(dateObj.getDate()).padStart(2, '0');
          const month = String(dateObj.getMonth() + 1).padStart(2, '0');
          const year = dateObj.getFullYear();
          formattedDate = `${day}/${month}/${year}`;
        } else if (rawTime.includes(' ')) {
          formattedDate = rawTime.split(' ')[0];
        }

        return (
          <Text style={{ fontSize: '13px', color: '#1677ff', fontWeight: 500 }}>
            {formattedDate}
          </Text>
        );
      },
    },
    {
      title: 'KHÁCH HÀNG',
      dataIndex: 'fullName',
      key: 'fullName',
      render: (_: any, record: Customer) => <strong>{record.fullName || record.ho_ten || '---'}</strong>,
    },
    {
      title: 'SỐ ĐIỆN THOẠI',
      dataIndex: 'phone',
      key: 'phone',
      render: (_: any, record: Customer) => {
        const phone = record.phone || record.dien_thoai;
        return (
          <a href={`tel:${phone}`} style={{ color: '#1677ff', fontWeight: 500 }}>
            {phone || '---'}
          </a>
        );
      },
    },
    {
      title: 'ĐỊA CHỈ',
      dataIndex: 'address',
      key: 'address',
      render: (_: any, record: Customer) => (
        <Text style={{ fontSize: '13px' }}>{record.address || record.dia_chi || '---'}</Text>
      ),
    },
    {
      title: 'TÊN XE / HÃNG',
      dataIndex: 'vehicleName',
      key: 'vehicleName',
      render: (_: any, record: Customer) => {
        const name = record.vehicleName || [record.brand, record.model].filter(Boolean).join(' ') || record.model;
        return <strong>{name || '---'}</strong>;
      },
    },
    {
      title: 'MÀU XE',
      dataIndex: 'color',
      key: 'color',
      render: (_: any, record: Customer) => {
        const color = record.color || record.mau;
        return color ? <Tag color="cyan">{color}</Tag> : <Text type="secondary">---</Text>;
      },
    },
    {
      title: 'SỐ KHUNG',
      dataIndex: 'frameNumber',
      key: 'frameNumber',
      render: (_: any, record: Customer) => {
        const frame = record.frameNumber || record.so_khung;
        return frame ? (
          <Text code style={{ color: '#d46b08', fontWeight: 600 }}>{frame}</Text>
        ) : (
          <Text type="secondary">---</Text>
        );
      },
    },
    {
      title: 'SỐ MÁY / ACQUY',
      dataIndex: 'batteryNumber',
      key: 'batteryNumber',
      render: (_: any, record: Customer) => {
        const bat = record.batteryNumber || record.so_pin;
        return bat ? (
          <Text code style={{ color: '#389e0d', fontWeight: 600 }}>{bat}</Text>
        ) : (
          <Text type="secondary">---</Text>
        );
      },
    },
    {
      title: 'GIÁ BÁN',
      dataIndex: 'price',
      key: 'price',
      render: (_: any, record: Customer) => {
        const numPrice = Number(record.price || record.gia_xe);
        if (!isNaN(numPrice) && numPrice > 0) {
          return (
            <Text type="success" style={{ fontWeight: 600 }}>
              {numPrice.toLocaleString('vi-VN')} VNĐ
            </Text>
          );
        }
        return <Text type="secondary">---</Text>;
      },
    },
    {
      title: 'CHI NHÁNH',
      dataIndex: 'branchName',
      key: 'branchName',
      render: (branch?: string) => (
        <Tag color="blue" style={{ borderRadius: 4 }}>
          {branch || '---'}
        </Tag>
      ),
    },
    {
      title: 'THAO TÁC',
      key: 'actions',
      render: (_: any, record: Customer) => (
        <Space size="small">
          <Button
            type="primary"
            size="small"
            icon={<PrinterOutlined />}
            style={{ backgroundColor: '#722ed1', borderColor: '#722ed1', borderRadius: 4 }}
            onClick={() => handlePrint(record)}
          >
            In HD
          </Button>
          <Button type="link" icon={<EditOutlined />} onClick={() => handleOpenEditModal(record)}>
            Sửa
          </Button>
          <Popconfirm
            title="Xác nhận xóa"
            description="Bạn có chắc chắn muốn xóa khách hàng này?"
            onConfirm={() => handleDelete(record.id)}
            okText="Xóa"
            cancelText="Hủy"
            okButtonProps={{ danger: true }}
          >
            <Button type="link" danger icon={<DeleteOutlined />}>
              Xóa
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px', backgroundColor: '#f5f7fa', minHeight: '100vh' }}>
      <Card bordered={false} style={{ borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <Title level={3} style={{ margin: 0 }}>
              Quản Lý Khách Hàng
            </Title>
            <Text type="secondary">Theo dõi thông tin mua xe, địa chỉ, Màu sắc, Số Khung & Số Acquy</Text>
          </div>
          <Space>
            <Button
              type="primary"
              style={{ backgroundColor: '#217346', borderColor: '#217346', borderRadius: 6 }}
              icon={<FileExcelOutlined />}
              onClick={() => {
                exportForm.resetFields();
                setIsExportModalOpen(true);
              }}
            >
              Xuất Excel
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenAddModal} style={{ borderRadius: 6 }}>
              Thêm mới
            </Button>
            <Button icon={<ReloadOutlined />} loading={loading} onClick={fetchCustomers} style={{ borderRadius: 6 }}>
              Tải lại dữ liệu
            </Button>
          </Space>
        </div>

        <div style={{ marginBottom: 20 }}>
          <Input
            placeholder="Tìm theo tên khách, SĐT, địa chỉ, màu sắc, tên xe, Số Khung, Số Acquy hoặc chi nhánh..."
            prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
            value={searchText}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setSearchText(e.target.value)}
            allowClear
            size="large"
            style={{ borderRadius: 8 }}
          />
        </div>

        <Table<Customer>
          dataSource={filteredCustomers}
          columns={columns}
          rowKey={(record) => record.id || Math.random()}
          loading={loading}
          pagination={{ pageSize: 10 }}
          scroll={{ x: 'max-content' }}
        />
      </Card>

      {/* MODAL THÊM / SỬA KHÁCH HÀNG */}
      <Modal
        title={editingCustomer ? `Sửa thông tin #${editingCustomer.id}` : 'Thêm Mới Khách Hàng'}
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        footer={null}
        destroyOnClose
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
          <Form.Item name="brand" label="Hãng xe">
            <Input />
          </Form.Item>
          <Form.Item name="model" label="Model xe">
            <Input />
          </Form.Item>
          <Form.Item name="color" label="Màu xe">
            <Input placeholder="Nhập màu xe (vd: Xám bóng, Trắng đen...)" />
          </Form.Item>
          <Form.Item name="frameNumber" label="Số Khung">
            <Input placeholder="Nhập số khung..." />
          </Form.Item>
          <Form.Item name="batteryNumber" label="Số Máy / Acquy">
            <Input placeholder="Nhập số máy hoặc số acquy..." />
          </Form.Item>
          <Form.Item name="price" label="Giá bán (VNĐ)">
            <InputNumber
              style={{ width: '100%' }}
              formatter={(val) => `${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}
              parser={(val) => val?.replace(/\./g, '') as unknown as number}
            />
          </Form.Item>
          <Form.Item name="staffName" label="Nhân viên">
            <Input />
          </Form.Item>
          <Form.Item name="branchName" label="Chi nhánh">
            <Input />
          </Form.Item>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 24 }}>
            <Button onClick={() => setIsModalOpen(false)}>Hủy</Button>
            <Button type="primary" htmlType="submit" loading={submitting}>
              {editingCustomer ? 'Lưu thay đổi' : 'Tạo mới'}
            </Button>
          </div>
        </Form>
      </Modal>

      {/* MODAL BỘ LỌC XUẤT EXCEL */}
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

          <Text type="secondary" style={{ display: 'block', marginBottom: 20, fontSize: '13px' }}>
            💡 Mẹo: Bạn có thể để trống các ô nếu muốn xuất toàn bộ dữ liệu.
          </Text>

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
    </div>
  );
}
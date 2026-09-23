import express, { Request, Response } from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import branchRoutes from './routes/branchRoutes';

const prisma = new PrismaClient();
const app = express();

// 1. Cấu hình CORS
app.use(
  cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 2. Health check route
app.get('/', (_req: Request, res: Response) => {
  res.json({ message: 'Xe May Tung Phuong Backend is running!' });
});

// Mount branch routes
app.use('/api/branches', branchRoutes);

// Hàm tiện ích làm sạch tên xe, tránh dính ISO timestamp
const cleanVehicleName = (vehicleName?: string, brand?: string, model?: string) => {
  let name = vehicleName || [brand, model].filter(Boolean).join(' ');
  if (!name || (name.includes('T') && name.includes('Z') && name.includes(':'))) {
    name = [brand, model].filter(Boolean).join(' ');
  }
  return name || null;
};

// 3. Lấy danh sách khách hàng
app.get('/api/customers', async (_req: Request, res: Response) => {
  try {
    const customers = await prisma.customer.findMany({
      orderBy: { id: 'desc' },
    });
    return res.status(200).json({
      success: true,
      data: customers,
    });
  } catch (error) {
    console.error('Error fetching customers:', error);
    return res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
});

// 4. Thêm khách hàng thủ công từ Dashboard
app.post('/api/customers', async (req: Request, res: Response) => {
  try {
    const {
      fullName,
      phone,
      address,
      brand,
      model,
      vehicleName,
      color,
      price,
      prepaidAmount,
      note,
      promotion,     // ⚡ Mới
      staffName,
      branchName,
      frameNumber,
      batteryNumber,
      imageUrl,
      formTimestamp,
      installmentBank,
      debtAmount,
      email,
      idCardNumber,
      idCardIssueDate,
    } = req.body;

    const fullVehicle = cleanVehicleName(vehicleName, brand, model);
    const parsedPrice = price ? parseInt(String(price).replace(/[^0-9]/g, ''), 10) : null;
    const parsedPrepaid = prepaidAmount ? parseInt(String(prepaidAmount).replace(/[^0-9]/g, ''), 10) : null;
    const parsedDebt = debtAmount ? parseInt(String(debtAmount).replace(/[^0-9]/g, ''), 10) : null;

    const newCustomer = await prisma.customer.create({
      data: {
        fullName,
        phone: phone ? String(phone) : null,
        address: address || null,
        vehicleName: fullVehicle,
        color: color || null,
        price: isNaN(parsedPrice as number) ? null : parsedPrice,
        prepaidAmount: isNaN(parsedPrepaid as number) ? null : parsedPrepaid,
        note: note || null,
        promotion: promotion || null, // ⚡ Mới
        staffName: staffName || null,
        branchName: branchName || null,
        frameNumber: frameNumber || null,
        batteryNumber: batteryNumber || null,
        imageUrl: imageUrl || null,
        formTimestamp: formTimestamp || new Date().toLocaleDateString('vi-VN'),
        installmentBank: installmentBank || null,
        debtAmount: isNaN(parsedDebt as number) ? null : parsedDebt,
        email: email || null,
        idCardNumber: idCardNumber || null,
        idCardIssueDate: idCardIssueDate || null,
      },
    });

    return res.status(201).json({ success: true, data: newCustomer });
  } catch (error) {
    console.error('Error creating customer:', error);
    return res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
});

// 5. Cập nhật thông tin khách hàng
app.put('/api/customers/:id', async (req: Request, res: Response) => {
  try {
    const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const customerId = parseInt(rawId, 10);

    if (isNaN(customerId)) {
      return res.status(400).json({ success: false, message: 'Invalid ID' });
    }

    const {
      fullName,
      phone,
      address,
      brand,
      model,
      vehicleName,
      color,
      price,
      prepaidAmount,
      note,
      promotion,     // ⚡ Mới
      staffName,
      branchName,
      frameNumber,
      batteryNumber,
      installmentBank,
      debtAmount,
      email,
      idCardNumber,
      idCardIssueDate,
    } = req.body;

    const fullVehicle = cleanVehicleName(vehicleName, brand, model);
    const parsedPrice = price ? parseInt(String(price).replace(/[^0-9]/g, ''), 10) : null;
    const parsedPrepaid = prepaidAmount ? parseInt(String(prepaidAmount).replace(/[^0-9]/g, ''), 10) : null;
    const parsedDebt = debtAmount ? parseInt(String(debtAmount).replace(/[^0-9]/g, ''), 10) : null;

    const updatedCustomer = await prisma.customer.update({
      where: { id: customerId },
      data: {
        fullName,
        phone: phone ? String(phone) : null,
        address: address || null,
        vehicleName: fullVehicle,
        color: color || null,
        price: isNaN(parsedPrice as number) ? null : parsedPrice,
        prepaidAmount: isNaN(parsedPrepaid as number) ? null : parsedPrepaid,
        note: note || null,
        promotion: promotion || null, // ⚡ Mới
        staffName: staffName || null,
        branchName: branchName || null,
        frameNumber: frameNumber || null,
        batteryNumber: batteryNumber || null,
        installmentBank: installmentBank || null,
        debtAmount: isNaN(parsedDebt as number) ? null : parsedDebt,
        email: email || null,
        idCardNumber: idCardNumber || null,
        idCardIssueDate: idCardIssueDate || null,
      },
    });

    return res.status(200).json({ success: true, data: updatedCustomer });
  } catch (error) {
    console.error('Error updating customer:', error);
    return res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
});

// 6. Xóa khách hàng
app.delete('/api/customers/:id', async (req: Request, res: Response) => {
  try {
    const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const customerId = parseInt(rawId, 10);

    if (isNaN(customerId)) {
      return res.status(400).json({ success: false, message: 'Invalid ID' });
    }

    await prisma.customer.delete({
      where: { id: customerId },
    });

    return res.status(200).json({ success: true, message: 'Deleted successfully' });
  } catch (error) {
    console.error('Error deleting customer:', error);
    return res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
});

// 7. Webhook nhận dữ liệu từ Google Apps Script
app.post('/api/customers/webhook', async (req: Request, res: Response) => {
  try {
    const {
      timestamp,
      fullName,
      phone,
      address,
      brand,
      model,
      vehicleName,
      price,
      prepaidAmount,
      so_tien_tra_truoc,
      note,
      ghi_chu,
      promotion,          // ⚡ Mới từ Apps Script
      uudai_quatang,      // Fallback key
      staffName,
      branchName,
      imageUrl,
      color,
      frameNumber,
      batteryNumber,
      installmentBank,
      debtAmount,
      email,
      idCardNumber,
      idCardIssueDate,
    } = req.body;

    if (!fullName) {
      return res.status(400).json({ success: false, message: 'FullName is required' });
    }

    const fullVehicle = cleanVehicleName(vehicleName, brand, model);
    const parsedPrice = price ? parseInt(String(price).replace(/[^0-9]/g, ''), 10) : null;
    
    const rawPrepaid = prepaidAmount !== undefined ? prepaidAmount : so_tien_tra_truoc;
    const parsedPrepaid = rawPrepaid ? parseInt(String(rawPrepaid).replace(/[^0-9]/g, ''), 10) : null;
    
    const parsedDebt = debtAmount ? parseInt(String(debtAmount).replace(/[^0-9]/g, ''), 10) : null;

    const newCustomer = await prisma.customer.create({
      data: {
        fullName,
        phone: phone ? String(phone) : null,
        address: address || null,
        vehicleName: fullVehicle,
        color: color || null,
        price: isNaN(parsedPrice as number) ? null : parsedPrice,
        prepaidAmount: isNaN(parsedPrepaid as number) ? null : parsedPrepaid,
        note: note || ghi_chu || null,
        promotion: promotion || uudai_quatang || req.body['Ưu đãi/Quà tặng'] || null, // ⚡ Linh hoạt hỗ trợ nhiều key từ Apps Script
        staffName: staffName || null,
        branchName: branchName || null,
        imageUrl: imageUrl || null,
        frameNumber: frameNumber || null,
        batteryNumber: batteryNumber || null,
        formTimestamp: timestamp || '',
        installmentBank: installmentBank || null,
        debtAmount: isNaN(parsedDebt as number) ? null : parsedDebt,
        email: email || null,
        idCardNumber: idCardNumber || null,
        idCardIssueDate: idCardIssueDate || null,
      },
    });

    return res.status(201).json({ success: true, data: newCustomer });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
});

export default app;
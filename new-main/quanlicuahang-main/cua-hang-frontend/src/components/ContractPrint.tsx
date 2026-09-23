export interface Customer {
  id?: number;
  fullName?: string;
  ho_ten?: string;
  phone?: string;
  dien_thoai?: string;
  address?: string;
  dia_chi?: string;
  model?: string;
  mau?: string;
  color?: string;
  frameNumber?: string;
  so_khung?: string;
  batteryNumber?: string;
  so_pin?: string;
  price?: string | number;
  gia_xe?: string | number;
  tong_thanh_toan?: string | number;
  vehicleName?: string;
  brand?: string;
  formTimestamp?: string;
  [key: string]: any;
}

export const printContractDirectly = (customer: Customer) => {
  const today = new Date();
  const day = String(today.getDate()).padStart(2, '0');
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const year = today.getFullYear();

  const hoTen = customer.fullName || customer.ho_ten || '';
  const dienThoai = customer.phone || customer.dien_thoai || '';
  const diaChi = customer.address || customer.dia_chi || '';
  const modelXe = customer.vehicleName || [customer.brand, customer.model].filter(Boolean).join(' ') || customer.model || '';
  const mauXe = customer.color || customer.mau || '';
  const soKhung = customer.frameNumber || customer.so_khung || '';
  const soPin = customer.batteryNumber || customer.so_pin || '';

  const formatMoney = (val?: any) => {
    if (!val) return '';
    const num = Number(String(val).replace(/[^0-9]/g, ''));
    return isNaN(num) || num === 0 ? String(val) : num.toLocaleString('vi-VN') + ' VNĐ';
  };

  const giaXe = formatMoney(customer.price || customer.gia_xe);
  const tongThanhToan = formatMoney(customer.tong_thanh_toan || customer.price || customer.gia_xe);

  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = 'none';
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) return;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Hop_dong_${hoTen}</title>
      <style>
        @page {
          size: A4 portrait;
          margin: 4mm 6mm;
        }
        * {
          box-sizing: border-box;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        html, body {
          margin: 0;
          padding: 0;
          background: #fff;
          font-family: "Times New Roman", Times, serif;
          font-size: 11px;
          line-height: 1.22;
          color: #000;
        }
        .page {
          width: 100%;
        }
        .page-break {
          page-break-before: always;
          break-before: page;
        }
        table {
          width: 100%;
          border-collapse: collapse;
        }
        table.main-grid {
          border: 1px solid #000;
          margin: 3px 0;
          table-layout: fixed;
        }
        table.main-grid td, table.main-grid th {
          border: 1px solid #000;
          padding: 2.5px 4px;
          vertical-align: top;
        }
        table.maintenance-table {
          border: 1px solid #000;
          font-size: 9.5px;
          margin-top: 4px;
        }
        table.maintenance-table th, table.maintenance-table td {
          border: 1px solid #000;
          text-align: center;
          padding: 1.5px 2px;
          height: 17px;
        }
        .text-left { text-align: left !important; }
        .text-center { text-align: center !important; }
        .text-right { text-align: right !important; }
        .bold { font-weight: bold; }
        .italic { font-style: italic; }
      </style>
    </head>
    <body>
      <div class="page">
        <table style="margin-bottom: 2px;">
          <tbody>
            <tr>
              <td style="width: 50%; vertical-align: top; text-align: center;">
                <strong style="font-size: 11.5px;">CÔNG TY TNHH XE MÁY TÙNG PHƯỢNG</strong><br />
                <span style="font-size: 10px;">Hệ thống mua bán xe máy - Phụ tùng chính hãng</span><br />
                <span style="font-size: 10px;">ĐT: 0976.820.941 - 0866.97.98.41</span>
              </td>
              <td style="width: 50%; vertical-align: top; text-align: center;">
                <strong style="font-size: 11.5px;">CỘNG HOÀ XÃ HỘI CHỦ NGHĨA VIỆT NAM</strong><br />
                <strong style="font-size: 11px;">Độc lập - Tự do - Hạnh phúc</strong><br />
                <i style="font-size: 10px;">..., Ngày ${day} Tháng ${month} Năm ${year}</i>
              </td>
            </tr>
          </tbody>
        </table>

        <div style="text-align: center; margin: 2px 0 4px 0;">
          <div class="bold" style="font-size: 14px;">BIÊN NHẬN</div>
          <div class="bold" style="font-size: 11.5px;">(KIÊM HỢP ĐỒNG BÁN XE)</div>
        </div>

        <div><strong>Bên A ( Bên bán xe): CÔNG TY TNHH XE MÁY TÙNG PHƯỢNG:</strong></div>
        <div>Tài khoản: CÔNG TY TNHH XE MÁY TÙNG PHƯỢNG</div>
        <div>Điện thoại liên hệ: 0976.820.941 - 0866.97.98.41</div>
        <div>CN1: 102 Ấp Nội Ô, Xã Giồng Riềng, Tỉnh Kiên Giang</div>
        <div>CN2: 41 Hùng Vương, Ấp 6, Xã Giồng Riềng, Tỉnh Kiên Giang</div>

        <div style="margin-top: 3px;"><strong>Bên B ( Bên mua xe):</strong></div>
        <div>
          Họ và tên: <strong>${hoTen || '...................................................'}</strong>
          &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
          Điện thoại: <strong>${dienThoai || '.........................'}</strong>
        </div>
        <div>Địa chỉ: <strong>${diaChi || '.......................................................................................................................................'}</strong></div>
        <div>CCCD số: &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Ngày cấp: &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Ngày cấp: &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Nơi cấp: Cục Cảnh sát quản lý hành chính về TTXH</div>

        <div style="margin: 3px 0 2px 0;">
          Sau khi bàn bạc và đi đến thống nhất, bên A đồng ý bán xe và bên B đồng ý mua xe với các điều khoản sau:
        </div>

        <table class="main-grid">
          <thead>
            <tr>
              <th style="width: 33.33%; text-align: center; font-weight: bold;">I.ĐIỀU KHOẢN VỀ BẢO HÀNH</th>
              <th style="width: 33.33%; text-align: center; font-weight: bold;">II. THÔNG TIN VỀ XE</th>
              <th style="width: 33.34%; text-align: center; font-weight: bold;">III. HƯỚNG DẪN SỬ DỤNG ẮC QUY</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <div class="bold">YADEA</div>
                <div style="margin: 2px 0;">Động cơ, IC, bộ sạc bảo hành 24 tháng. Bình bảo hành 24 tháng, cụ thể lỗi 1 bình đổi cả bộ trong 18 tháng, lỗi bình nào đổi bình đó trong 6 tháng còn lại (Hoặc 20.000km)</div>
                <div style="margin: 2px 0;">Động cơ, IC, bộ sạc bảo hành 36 tháng. Pin bảo hành 36 tháng (Hoặc 30.000km)</div>
              </td>
              <td>
                <div>*Model : <strong>${modelXe}</strong></div>
                <div>*Màu: <strong>${mauXe}</strong></div>
                <div>*Số khung: <strong>${soKhung}</strong></div>
                <div>* Số ắc quy/pin: <strong>${soPin}</strong></div>
                <div>* Số động cơ:</div>
                <div>* Mua thêm phụ kiện:</div>
                <div>* Thu xe cũ:</div>
                <div>Còn lại:</div>
                <div>* Đã cọc:</div>
                <div>* Giá xe: <strong>${giaXe}</strong></div>
                <div>* <strong>Tổng thanh toán: ${tongThanhToan}</strong></div>
                <div>Hình thức thanh toán:</div> <br />
                </div>*Trả trước: &nbsp;&nbsp;&nbsp;&nbsp;</div> <br />
                </div>*Còn lại:</div><br />
                <div>* Phụ kiện theo xe: Bộ sạc</div>
              </td>
              <td>
                <div class="italic" style="font-size: 10px;">
                  <strong>Lần sạc đầu tiên:</strong> sau khi sạc ắc quy đầy, sạc báo đèn xanh, rút sạc ra đợi khoảng 20 phút, cắm lại cho sạc tiếp tục khoảng 1 tiếng.
                </div>
                <div class="italic" style="font-size: 10px; margin-top: 2px;">
                  <strong>Trong quá trình sử dụng:</strong><br />
                  + Bạn nên để xe khoảng 30 phút để ắc quy nguội bớt rồi hãy sạc.<br />
                  + Nên sạc đầy rồi mới sử dụng. Hạn chế tối đa tình trạng xe cạn ắc quy và sạc nhiều lần trong ngày.<br />
                  + Trường hợp có việc bận không có nhu cầu sử dụng xe, thì mỗi tuần nên sạc 1 lần.
                </div>
                <div class="bold" style="font-size: 9.5px; margin-top: 3px;">
                  ẮC QUY SẼ XUỐNG CẤP DẦN THEO THỜI GIAN NÊN HÃY SỬ DỤNG ĐÚNG CÁCH ĐỂ SỬ DỤNG ẮC QUY ĐƯỢC LÂU HƠN
                </div>
              </td>
            </tr>
            <tr>
              <td>
                <div class="bold">HONDA, YAMAHA, SUZUKI, SYM...</div>
                
                <div style="margin: 2px 0;">Động cơ, khung sườn bảo hành chính hãng theo sổ bảo hành.</div><br />
                
                <div style="margin: 2px 0;">Ắc quy khởi động bảo hành 12 tháng.</div><br />
                
                <div style="margin: 2px 0;">Bảo dưỡng định kỳ miễn phí tiền công theo quy định.</div>
              
                </td>
              <td>
                <div class="bold">IV: Thoả thuận và thống nhất giữa hai bên như sau</div>
                <div>* Giá bán xe chưa bao gồm lệ phí trước bạ, phí bấm biển số và phí dịch vụ (đối với xe máy)</div>
                <div>* Dịch vụ bấm biển số (không bao bảo hiểm và phí kẹp biển số):</div>
                <div class="bold">* Quà tặng: NÓN BẢO HIỂM CHÍNH HÃNG, ÁO MƯA</div>
                <div class="bold italic" style="margin-top: 2px;">*ƯU ĐÃI ĐẶC BIỆT: Miễn phí tiền công bảo dưỡng định kỳ và kiểm tra xe tại cửa hàng</div>
              </td>
              <td>
                <div class="bold">V: Điều khoản chung</div>
                <div>* Bên B đã kiểm tra xe mới 100%, không trầy xước, phụ tùng theo xe đầy đủ.</div>
                <div>* Bên B đã được bên A hướng dẫn sử dụng xe, chế độ bảo hành và kỹ năng lái xe an toàn, nhận quà khuyến mãi đầy đủ, bên B đã đọc và xác nhận những nội dung trên.</div>
                <div>* Biên nhận được lập thành 02 bản có giá trị như nhau , mỗi bên giữ 1 bản</div>
              </td>
            </tr>
          </tbody>
        </table>

        <div style="margin-top: 3px;">
          <div class="bold">*LƯU Ý :</div>
          <table style="font-size: 9.5px; line-height: 1.15;">
            <tbody>
              <tr><td style="width: 14px; vertical-align: top;">✓</td><td class="bold italic">LUÔN ĐỘI NÓN BẢO HIỂM KHI THAM GIA GIAO THÔNG.</td></tr>
              <tr><td style="vertical-align: top;">✓</td><td class="bold">NHỮNG PHẦN HAO MÒN TRONG QUÁ TRÌNH SỬ DỤNG (LỐP, MÁ PHANH, BÓNG ĐÈN...) KHÔNG BẢO HÀNH.</td></tr>
              <tr><td style="vertical-align: top;">✓</td><td class="bold">KHÔNG BẢO HÀNH ĐỐI VỚI XE ĐÃ THAY ĐỔI KẾT CẤU, ĐỘ MÁY HOẶC SỬ DỤNG SAI QUY CÁCH.</td></tr>
              <tr><td style="vertical-align: top;">✓</td><td class="bold">BẢO HÀNH SỬA CHỮA KHÔNG BẢO HÀNH ĐỔI MỚI.</td></tr>
              <tr><td style="vertical-align: top;">✓</td><td class="bold">BẢO HÀNH PHẢI CHO THÁO XE, ĐỒNG THỜI XE PHẢI ĐƯỢC ĐEM ĐẾN CỬA HÀNG.</td></tr>
              <tr><td style="vertical-align: top;">✓</td><td class="bold">MỌI VẤN ĐỀ PHÁT SINH VỚI XE TRONG QUÁ TRÌNH SỬ DỤNG PHẢI ĐEM ĐẾN CỬA HÀNG TRONG THỜI GIAN NHANH NHẤT (1-3 NGÀY) ĐỂ ĐƯỢC GIẢI QUYẾT. NẾU SAU THỜI GIAN TRÊN CỬA HÀNG HOÀN TOÀN KHÔNG CHỊU TRÁCH NHIỆM.</td></tr>
              <tr><td style="vertical-align: top;">✓</td><td class="bold">PHÍ ĐỔI - TRẢ SẢN PHẨM 30% TRONG VÒNG 30 NGÀY, KỂ TỪ NGÀY MUA.</td></tr>
            </tbody>
          </table>
          <div class="text-right italic" style="margin-top: 2px; font-size: 9.5px;">
            Tôi (bên B) hoàn toàn đồng ý với những thoả thuận trên.
          </div>
        </div>

        <table style="margin-top: 10px; text-align: center;">
          <tbody>
            <tr>
              <td style="width: 50%; vertical-align: top;">
                <strong style="font-size: 11.5px;">Bên bán A</strong><br />
                <i style="font-size: 9.5px;">( Ký và ghi rõ họ tên)</i>
              </td>
              <td style="width: 50%; vertical-align: top;">
                <strong style="font-size: 11.5px;">Bên mua B</strong><br />
                <i style="font-size: 9.5px;">( Ký và ghi rõ họ tên)</i>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="page page-break">
        <div class="text-center bold" style="font-size: 13px; margin: 4px 0 6px 0;">
          PHIẾU KIỂM TRA BẢO DƯỠNG ĐỊNH KỲ (YADEA)
        </div>

        <table class="maintenance-table">
          <thead>
            <tr>
              <th rowspan="2" style="width: 28px;">STT</th>
              <th rowspan="2" style="width: 170px;">Nội dung công việc</th>
              <th colspan="5">Cấp bảo dưỡng</th>
              <th rowspan="2" style="width: 55px;">Kết quả</th>
              <th rowspan="2">Chú thích</th>
            </tr>
            <tr>
              <th style="width: 26px;">L1</th>
              <th style="width: 26px;">L2</th>
              <th style="width: 26px;">L3</th>
              <th style="width: 26px;">L4</th>
              <th style="width: 26px;">L5</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>1</td>
              <td class="text-left">Hệ thống phanh</td>
              <td>KT<br/>ĐC</td>
              <td>KT<br/>ĐC</td>
              <td>KT<br/>ĐC</td>
              <td>KT<br/>ĐC</td>
              <td>BT<br/>ĐC</td>
              <td></td>
              <td rowspan="7" class="text-left" style="font-size: 8.5px; vertical-align: top; padding: 4px;">
                <strong>Chú thích:</strong> Khoanh tròn các hạng mục đã thực hiện.<br />
                <strong>BT:</strong> Bôi trơn &nbsp;&nbsp;&nbsp;&nbsp; <strong>KT:</strong> Kiểm tra<br />
                <strong>ĐC:</strong> Điều chỉnh &nbsp; <strong>TT:</strong> Thay thế<br /><br />
                <strong>Lần 1:</strong> 300km/1tháng<br />
                <strong>Lần 2:</strong> 2500km/3tháng<br />
                <strong>Lần 3:</strong> 5000km/6tháng<br />
                <strong>Lần 4:</strong> 7500km/9tháng<br />
                <strong>Lần 5:</strong> 10000km/12tháng<br />
                <i>(Tuỳ theo điều kiện nào đến trước)</i>
              </td>
            </tr>
            <tr><td>2</td><td class="text-left">Kiểm tra tay ga</td><td>KT</td><td>KT</td><td>KT</td><td>KT</td><td>KT</td><td></td></tr>
            <tr><td>3</td><td class="text-left">Kiểm tra hệ thống chống trộm</td><td>KT</td><td>KT</td><td>KT</td><td>KT</td><td>KT</td><td></td></tr>
            <tr><td>4</td><td class="text-left">Kiểm tra động cơ</td><td>KT</td><td>KT</td><td>KT</td><td>KT</td><td>KT</td><td></td></tr>
            <tr><td>5</td><td class="text-left">Hệ thống chiếu sáng</td><td>KT</td><td>KT</td><td>KT</td><td>KT</td><td>KT</td><td></td></tr>
            <tr><td>6</td><td class="text-left">Kiểm tra càng trước, sau</td><td>KT</td><td>KT</td><td>KT</td><td>KT</td><td>KT</td><td></td></tr>
            <tr><td>7</td><td class="text-left">Kiểm tra sạc</td><td>KT</td><td>KT</td><td>KT</td><td>KT</td><td>KT</td><td></td></tr>
            <tr>
              <td>8</td>
              <td class="text-left">Kiểm tra chân chống cạnh, giữa</td>
              <td>KT</td>
              <td>KT<br/>BT</td>
              <td>KT</td>
              <td>KT<br/>BT</td>
              <td>KT<br/>BT</td>
              <td></td>
              <td rowspan="13" class="text-left italic" style="font-size: 9px; vertical-align: middle; padding: 6px; text-align: center;">
                Quý khách vui lòng đến bảo dưỡng theo lịch định kỳ để xe được vận hành tốt và bền lâu hơn.<br /><br />
                <strong>Xin cám ơn Quý khách!!!</strong>
              </td>
            </tr>
            <tr><td>9</td><td class="text-left">Kiểm tra giảm xóc (trước, sau)</td><td>KT</td><td>KT</td><td>KT</td><td>KT</td><td>KT</td><td></td></tr>
            <tr><td>10</td><td class="text-left">Dây nối ắc quy</td><td>KT</td><td>KT</td><td>KT</td><td>KT</td><td>KT</td><td></td></tr>
            <tr><td>11</td><td class="text-left">Kiểm tra còi</td><td>KT</td><td>KT</td><td>KT</td><td>KT</td><td>KT</td><td></td></tr>
            <tr><td>12</td><td class="text-left">Kiểm tra điện áp Ắc quy</td><td>KT</td><td>KT</td><td>KT</td><td>KT</td><td>KT</td><td></td></tr>
            <tr><td>13</td><td class="text-left">Loại bỏ tiếng ồn bất thường</td><td>KT<br/>ĐC</td><td>KT<br/>ĐC</td><td>KT<br/>ĐC</td><td>KT<br/>ĐC</td><td>KT<br/>ĐC</td><td></td></tr>
            <tr><td>14</td><td class="text-left">Áp suất lốp</td><td>KT<br/>ĐC</td><td>KT<br/>ĐC</td><td>KT<br/>ĐC</td><td>KT<br/>ĐC</td><td>KT<br/>ĐC</td><td></td></tr>
            <tr><td>15</td><td class="text-left">Hệ thống dây điện</td><td>KT</td><td>KT</td><td>KT</td><td>KT</td><td>KT</td><td></td></tr>
            <tr><td>16</td><td class="text-left">Cố định ốc vít</td><td>ĐC</td><td>ĐC</td><td>ĐC</td><td>ĐC</td><td>ĐC</td><td></td></tr>
            <tr><td>17</td><td class="text-left">Bôi trơn xe</td><td></td><td></td><td>BT</td><td></td><td>BT</td><td></td></tr>
            <tr><td>18</td><td class="text-left">Cơ cấu mở khoá yên</td><td>KT</td><td>KT</td><td>KT</td><td>KT</td><td>KT<br/>BT</td><td></td></tr>
            <tr><td>19</td><td class="text-left">Kiểm tra dầu phanh</td><td>KT</td><td>KT</td><td>KT</td><td>KT</td><td>KT</td><td></td></tr>
            <tr><td>20</td><td class="text-left">Kiểm tra cổ phốt</td><td>KT</td><td>KT</td><td>KT</td><td>KT</td><td>KT<br/>BT</td><td></td></tr>
          </tbody>
        </table>
      </div>
    </body>
    </html>
  `;

  doc.open();
  doc.write(html);
  doc.close();

  setTimeout(() => {
    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();
    setTimeout(() => {
      document.body.removeChild(iframe);
    }, 1000);
  }, 200);
};

export const ContractPrint = () => null;
export default printContractDirectly;
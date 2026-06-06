import React from 'react';

interface SpecItem {
  label: string;
  value: string;
}

interface SizeQtyItem {
  form: string;
  size: string;
  guide: string;
  qty: number;
}

interface PdfDesignSheetProps {
  fullname: string;
  phone: string;
  notes?: string;
  date?: string;
  productName: string;
  specs: SpecItem[];
  sizeQuantities: SizeQtyItem[];
  totalQty: number;
  colorSpecs: Array<{ label: string; colorHex?: string; value: string }>;
  pocketSpecs?: string[];
  reflectiveSpecs?: string[];
  imgFront: string;
  imgBack: string;
  logos: Array<{ src: string; position: string; scale: number; printStyle: string; isFree?: boolean }>;
  patterns?: Array<{ angle: string; src: string; scale: number; opacity: number; printType: string }>;
}

export const PdfDesignSheet: React.FC<PdfDesignSheetProps> = ({
  fullname,
  phone,
  notes = '',
  date = new Date().toLocaleDateString('vi-VN'),
  productName,
  specs,
  sizeQuantities,
  totalQty,
  colorSpecs,
  pocketSpecs = [],
  reflectiveSpecs = [],
  imgFront,
  imgBack,
  logos,
  patterns = [],
}) => {
  const recordCode = '810834'; // Standard matching ML-810834 or dynamic

  return (
    <div className="pdf-page" style={{
      width: '794px',
      minHeight: '1123px',
      maxHeight: '1123px',
      padding: '38px',
      boxSizing: 'border-box',
      background: 'white',
      position: 'relative',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      fontFamily: "'Inter', sans-serif",
      color: '#0f172a'
    }}>
      {/* Watermark Logo Overlay */}
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '500px',
        height: '500px',
        opacity: 0.05,
        pointerEvents: 'none',
        zIndex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <img src="public/logo.webp" alt="Watermark" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
      </div>

      <div style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', height: '100%' }}>
        {/* HEADER */}
        <div style={{
          height: '76px',
          borderBottom: '3.5px solid #0284c7',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '15px',
          boxSizing: 'border-box'
        }}>
          {/* Logo and company title on left */}
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'flex-start', fontFamily: "'Outfit', sans-serif", minWidth: '170px' }}>
              <span style={{ fontSize: '24px', fontWeight: 900, color: '#0284c7', lineHeight: 0.95, letterSpacing: '0.5px' }}>MRS LINH</span>
              <span style={{ fontSize: '10px', fontWeight: 800, color: '#0f172a', lineHeight: 0.95, letterSpacing: '3.5px', marginTop: '4px' }}>UNIFORM</span>
              <span style={{ fontSize: '6.5px', fontWeight: 700, color: '#64748b', lineHeight: 0.95, letterSpacing: '0.2px', marginTop: '4px', textTransform: 'uppercase' }}>ĐỒNG PHỤC CHUYÊN NGHIỆP</span>
            </div>
            <div style={{ width: '1px', height: '45px', backgroundColor: '#cbd5e1', margin: '0 15px' }} />
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '2px', fontSize: '7.5px', color: '#475569', lineHeight: 1.2 }}>
              <span style={{ fontSize: '9px', fontWeight: 800, color: '#0f172a', lineHeight: 1.3 }}>CÔNG TY TNHH DV TM ĐT ĐỒNG PHỤC MRS LINH</span>
              <span>📍 <strong>Địa chỉ:</strong> 16/6 Lưu Trọng Lư, Quy Nhơn, Gia Lai</span>
              <span>📞 <strong>SĐT/Zalo:</strong> 0934.975.913</span>
              <span style={{ color: '#0284c7', fontWeight: 600 }}>✉️ mrslinh@inaodongphucmrslinh.com</span>
            </div>
          </div>
          {/* Document Title on right */}
          <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '2px' }}>
            <span style={{ fontSize: '20px', fontWeight: 800, color: '#0284c7', letterSpacing: '-0.3px', lineHeight: 1.1 }}>BẢNG MÔ TẢ SẢN PHẨM</span>
            <span style={{ fontSize: '8px', color: '#475569' }}>Mã hồ sơ: ML-{recordCode} | <strong style={{ color: '#0284c7', fontWeight: 800 }}>TRANG 1/1</strong></span>
            <span style={{ fontSize: '8px', color: '#94a3b8', fontWeight: 500 }}>Hệ thống 3D Mrs Linh</span>
          </div>
        </div>

        {/* CUSTOMER BAR */}
        <div style={{
          backgroundColor: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: '8px',
          padding: '8px 12px',
          display: 'grid',
          gridTemplateColumns: '1.2fr 0.8fr',
          gap: '10px',
          boxSizing: 'border-box',
          marginBottom: '15px'
        }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#d60000', fontWeight: 'bold' }}>THÔNG TIN KHÁCH HÀNG</h3>
            <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#0f172a', marginBottom: '1px' }}>{fullname}</div>
            <div style={{ fontSize: '9.5px', color: '#475569' }}>Số điện thoại / Zalo: <strong>{phone}</strong></div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <h3 style={{ margin: 0, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#64748b', fontWeight: 'bold' }}>THỜI GIAN KHỞI TẠO</h3>
            <div style={{ fontSize: '9.5px', color: '#475569', fontWeight: 500 }}>{date}</div>
            <div style={{ fontSize: '9px', color: '#0284c7', fontWeight: 600, marginTop: '2px' }}>Trạng thái: Đã duyệt phác thảo 3D</div>
          </div>
        </div>

        {/* BODY */}
        <div style={{ display: 'flex', gap: '4%', flex: 1, boxSizing: 'border-box', marginBottom: '15px' }}>
          {/* LEFT COLUMN: 52% */}
          <div style={{ width: '52%', display: 'flex', flexDirection: 'column', gap: '12px', boxSizing: 'border-box' }}>
            {/* SỐ LƯỢNG ĐẶT HÀNG */}
            <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '8px 10px', boxSizing: 'border-box' }}>
              <h3 style={{ margin: '0 0 5px 0', fontSize: '10.5px', textTransform: 'uppercase', color: '#0f172a', borderBottom: '2px solid #cbd5e1', paddingBottom: '3px', fontWeight: 800 }}>SỐ LƯỢNG ĐẶT HÀNG</h3>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#0f172a', color: '#ffffff', textAlign: 'left' }}>
                    <th style={{ padding: '4px', width: '32%' }}>Form</th>
                    <th style={{ padding: '4px', textAlign: 'center', width: '18%' }}>Size</th>
                    <th style={{ padding: '4px', width: '32%' }}>Thông Số Chuẩn</th>
                    <th style={{ padding: '4px', textAlign: 'center', width: '18%' }}>Số Lượng</th>
                  </tr>
                </thead>
                <tbody>
                  {sizeQuantities.map((item, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '4px 6px', fontWeight: 'bold', color: item.form.includes('Nữ') ? '#ec4899' : '#0284c7' }}>{item.form}</td>
                      <td style={{ padding: '4px 6px', fontWeight: 'bold', textAlign: 'center', color: '#1e293b' }}>{item.size}</td>
                      <td style={{ padding: '4px 6px', color: '#64748b', fontSize: '8.5px' }}>{item.guide}</td>
                      <td style={{ padding: '4px 6px', textAlign: 'center', color: '#0284c7', fontWeight: 'bold' }}>{item.qty} chiếc</td>
                    </tr>
                  ))}
                  <tr style={{ backgroundColor: '#f1f5f9', fontWeight: 'bold', borderTop: '1px solid #94a3b8' }}>
                    <td colSpan={3} style={{ padding: '5px 4px', color: '#0f172a', fontSize: '9.5px', textTransform: 'uppercase' }}>TỔNG CỘNG SỐ LƯỢNG MẪU</td>
                    <td style={{ padding: '5px 4px', textAlign: 'center', color: '#d60000', fontSize: '10px' }}>{totalQty} chiếc</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* ĐẶC TẢ PHỐI MÀU & CHI TIẾT */}
            <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '8px 10px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <h3 style={{ margin: '0 0 2px 0', fontSize: '10.5px', textTransform: 'uppercase', color: '#0f172a', borderBottom: '2px solid #cbd5e1', paddingBottom: '3px', fontWeight: 800 }}>ĐẶC TẢ PHỐI MÀU & CHI TIẾT</h3>
              <div style={{ fontSize: '9.5px', fontWeight: 'bold', color: '#0284c7', marginBottom: '2px' }}>Mẫu sản phẩm: {productName}</div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '10px', color: '#475569' }}>
                {colorSpecs.map((spec, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '3px' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      {spec.colorHex && (
                        <span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '2px', backgroundColor: spec.colorHex, border: '1px solid #cbd5e1' }} />
                      )}
                      <strong>{spec.label}:</strong>
                    </span>
                    <span>{spec.value}</span>
                  </div>
                ))}
              </div>

              {pocketSpecs.length > 0 && (
                <div style={{ fontSize: '10px', color: '#475569', marginTop: '2px' }}>
                  📂 <strong>Cấu hình túi:</strong> {pocketSpecs.join(', ')}
                </div>
              )}
              {reflectiveSpecs.length > 0 && (
                <div style={{ fontSize: '10px', color: '#475569', marginTop: '2px' }}>
                  ⚡ <strong>Vạch phản quang:</strong> {reflectiveSpecs.join(', ')}
                </div>
              )}
            </div>

            {/* XÁC NHẬN KHÁCH HÀNG */}
            <div style={{
              backgroundColor: '#f8fafc',
              border: '1px dashed #cbd5e1',
              borderRadius: '8px',
              padding: '10px 14px',
              boxSizing: 'border-box',
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '15px',
              marginTop: 'auto'
            }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '9.5px', fontWeight: 'bold', color: '#0f172a', textTransform: 'uppercase' }}>ĐẠI DIỆN KHÁCH HÀNG</div>
                <div style={{ fontSize: '8px', color: '#64748b', marginTop: '2px' }}>(Ký, ghi rõ họ tên & đóng dấu)</div>
                <div style={{ marginTop: '25px', borderTop: '1px dashed #cbd5e1', width: '100px', marginLeft: 'auto', marginRight: 'auto' }} />
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '9.5px', fontWeight: 'bold', color: '#0284c7', textTransform: 'uppercase' }}>ĐỒNG PHỤC MRS LINH</div>
                <div style={{ fontSize: '8px', color: '#64748b', marginTop: '2px' }}>(Hệ thống duyệt tự động qua Zalo)</div>
                <div style={{ marginTop: '25px', fontSize: '9px', fontWeight: 'bold', color: '#0284c7' }}>ĐÃ XÁC NHẬN THIẾT KẾ 3D</div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: 44% */}
          <div style={{ width: '44%', display: 'flex', flexDirection: 'column', gap: '12px', boxSizing: 'border-box', justifyContent: 'flex-start', alignItems: 'center' }}>
            {/* FRONT CARD */}
            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '8px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              width: '100%',
              height: '220px',
              boxSizing: 'border-box',
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
            }}>
              <div style={{ width: '100%', height: '175px', display: 'flex', alignItems: 'center', justifycontent: 'center' }}>
                <img src={imgFront} alt="Front View" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', display: 'block', margin: '0 auto' }} />
              </div>
              <span style={{
                fontSize: '8.5px',
                fontWeight: '800',
                color: '#0284c7',
                textTransform: 'uppercase',
                backgroundColor: '#e0f2fe',
                padding: '2px 10px',
                borderRadius: '4px',
                marginTop: '6px'
              }}>MẶT TRƯỚC (FRONT VIEW)</span>
            </div>

            {/* BACK CARD */}
            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '8px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              width: '100%',
              height: '220px',
              boxSizing: 'border-box',
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
            }}>
              <div style={{ width: '100%', height: '175px', display: 'flex', alignItems: 'center', justifycontent: 'center' }}>
                <img src={imgBack} alt="Back View" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', display: 'block', margin: '0 auto' }} />
              </div>
              <span style={{
                fontSize: '8.5px',
                fontWeight: '800',
                color: '#0284c7',
                textTransform: 'uppercase',
                backgroundColor: '#e0f2fe',
                padding: '2px 10px',
                borderRadius: '4px',
                marginTop: '6px'
              }}>MẶT SAU (BACK VIEW)</span>
            </div>

            {/* ĐẶC TÍNH LOGO / HỌA TIẾT */}
            <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '8px 10px', boxSizing: 'border-box', width: '100%' }}>
              <h3 style={{ margin: '0 0 4px 0', fontSize: '10.5px', textTransform: 'uppercase', color: '#0f172a', borderBottom: '2px solid #cbd5e1', paddingBottom: '3px', fontWeight: 800 }}>ĐẶC TÍNH LOGO / HỌA TIẾT</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px' }}>
                {logos.length === 0 && patterns.length === 0 ? (
                  <div style={{ fontSize: '9.5px', color: '#64748b', fontStyle: 'italic', marginTop: '4px' }}>
                    Đặc tính logo / họa tiết: chưa gắn vào thiết kế
                  </div>
                ) : (
                  <>
                    {logos.map((logo, idx) => (
                      <div key={idx} style={{
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        padding: '6px 10px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        boxSizing: 'border-box',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.01)'
                      }}>
                        <div style={{ width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'white', border: '1px solid #e2e8f0', borderRadius: '4px', overflow: 'hidden', padding: '2px' }}>
                          <img src={logo.src} alt="Logo thumbnail" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '10px', fontWeight: 800, color: '#0f172a' }}>
                            {logo.isFree ? `Logo Tự Do #${idx + 1}` : 'Logo Cố Định'}: {logo.position}
                          </div>
                          <div style={{ fontSize: '8px', color: '#64748b', marginTop: '1px' }}>
                            Scale: <strong>{logo.scale}{logo.isFree ? 'px' : '%'}</strong> | Công nghệ: <strong>{logo.printStyle === 'theu' ? 'Thêu vi tính' : 'In PET sắc nét'}</strong>
                          </div>
                        </div>
                      </div>
                    ))}
                    {patterns.map((pattern, idx) => (
                      <div key={idx} style={{
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        padding: '6px 10px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        boxSizing: 'border-box',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.01)'
                      }}>
                        <div style={{ width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'white', border: '1px solid #e2e8f0', borderRadius: '4px', overflow: 'hidden', padding: '2px' }}>
                          <img src={pattern.src} alt="Pattern thumbnail" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '10px', fontWeight: 800, color: '#0f172a' }}>
                            Họa Tiết: {pattern.angle}
                          </div>
                          <div style={{ fontSize: '8px', color: '#64748b', marginTop: '1px' }}>
                            Scale: <strong>{pattern.scale}%</strong> | Opacity: <strong>{pattern.opacity}%</strong> | Kiểu in: <strong>{pattern.printType}</strong>
                          </div>
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <div style={{
          borderTop: '1px dashed #cbd5e1',
          paddingTop: '8px',
          textAlign: 'center',
          fontSize: '8.5px',
          color: '#64748b',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxSizing: 'border-box',
          marginTop: 'auto'
        }}>
          <span>Thiết kế & Sản xuất bởi <strong>Mrs Linh Uniform</strong> | Hotline: <strong>0934 975 913</strong></span>
          <span>www.inaodongphucmrslinh.com</span>
          <span style={{ fontWeight: 'bold', color: '#0284c7', background: '#e0f2fe', padding: '2px 10px', borderRadius: '9999px' }}>Trang 1 / 1</span>
        </div>
      </div>
    </div>
  );
};

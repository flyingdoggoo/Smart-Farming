import { Users, Info, ShieldCheck, Mail } from 'lucide-react';

export default function HelpPage() {
  const teamMembers = [
    { name: 'Võ Lương Nhật', class: '23DT2', department: 'Điện tử - Viễn thông', email: 'voluongnhat@gmail.com' },
    { name: 'Cao Nam Hải', class: '23DT2', department: 'Điện tử - Viễn thông', email: 'caokhi202@gmail.com' },
    { name: 'Trần Phước Quân', class: '23DT3', department: 'Điện tử - Viễn thông', email: 'phuocquan24705@gmail.com' },
    { name: 'Phạm Thị Vân Thư', class: '23DT2', department: 'Điện tử - Viễn thông', email: 'phamthivanthu2005@gmail.com' },
    { name: 'Nguyễn Thanh Hiếu', class: '23T-DT2', department: 'Công nghệ thông tin', email: 'nguyenthanhhieu17022005@gmail.com' },
  ];

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1>Trợ giúp & Thông tin Dự án</h1>
          <p>Giới thiệu về đề tài nghiên cứu khoa học và thông tin nhóm phát triển.</p>
        </div>
      </div>

      <div style={{ display: 'grid', gap: 'var(--space-md)' }}>
        <div className="card">
          <div className="card-body">
            <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <Info size={20} color="var(--primary)" /> Về Đề tài
            </h3>
            <p className="text-body-md text-muted" style={{ lineHeight: 1.6 }}>
              <strong>Tên đề tài:</strong> Nghiên cứu và Xây dựng Hệ thống Nông nghiệp Thông minh (Smart Farming).<br /><br />
              <strong>Mục đích:</strong> Tự động hóa quá trình chăm sóc cây trồng, thu thập dữ liệu cảm biến theo thời gian thực và ứng dụng Trí tuệ Nhân tạo (Machine Learning) để phân tích, dự đoán loại cây trồng phù hợp nhất với điều kiện thổ nhưỡng, góp phần nâng cao năng suất và tối ưu hóa tài nguyên nông nghiệp.
            </p>
          </div>
        </div>

        <div className="card">
          <div className="card-body">
            <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <Users size={20} color="var(--primary)" /> Nhóm Thực hiện
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 12 }}>
              {teamMembers.map((member, idx) => (
                <div key={idx} style={{ 
                  padding: 16, 
                  background: 'var(--surface-container-lowest)', 
                  border: '1px solid var(--outline-variant)', 
                  borderRadius: 'var(--radius-md)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 4
                }}>
                  <div style={{ fontWeight: 600, fontSize: 16, color: 'var(--on-surface)' }}>{member.name}</div>
                  <div className="text-label-sm text-muted">
                    Lớp {member.class}, Khoa {member.department}<br/>
                    Trường Đại học Bách khoa - Đại học Đà Nẵng
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, fontSize: 13, color: 'var(--primary)' }}>
                    <Mail size={14} /> {member.email}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-body">
            <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <ShieldCheck size={20} color="var(--primary)" /> Bản quyền
            </h3>
            <p className="text-body-md text-muted" style={{ lineHeight: 1.6 }}>
              © 2026 Bản quyền thuộc về Nhóm Nghiên cứu Khoa học - Đại học Bách Khoa Đà Nẵng.<br/>
              Phần mềm được phát triển phục vụ mục đích nghiên cứu học thuật và không mang tính thương mại.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

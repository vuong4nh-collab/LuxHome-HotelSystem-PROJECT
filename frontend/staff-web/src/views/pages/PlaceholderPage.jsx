import React from 'react';

export default function PlaceholderPage({ title, category, description }) {
  return (
    <div className="card placeholder-page-card">
      <div className="card-header">
        <h3 className="card-title">{title}</h3>
        <span className="badge badge-info">{category}</span>
      </div>
      <div className="card-body">
        <p className="text-muted">{description || `Nội dung thành phần ${title} theo tiêu chuẩn CoreUI Admin System.`}</p>

        {title === 'Colors' && (
          <div className="colors-grid">
            {[
              { name: 'Primary', hex: '#321fdb', desc: 'Thẻ Users, nút chính' },
              { name: 'Info', hex: '#3399ff', desc: 'Thẻ Income, line chart xanh' },
              { name: 'Warning', hex: '#f9b115', desc: 'Thẻ Conversion Rate' },
              { name: 'Danger', hex: '#e55353', desc: 'Thẻ Sessions, ngưỡng đứt đỏ' },
              { name: 'Success', hex: '#2eb85c', desc: 'Line chart xanh lá, visits progress' },
              { name: 'Sidebar Dark', hex: '#3c4b64', desc: 'Nền sidebar' },
              { name: 'Sidebar Brand', hex: '#303c54', desc: 'Nền logo & footer' },
              { name: 'Body Background', hex: '#ebedef', desc: 'Nền trang tổng thể' },
            ].map(c => (
              <div key={c.name} className="color-swatch-card">
                <div className="color-swatch-box" style={{ backgroundColor: c.hex }} />
                <div className="color-swatch-info">
                  <strong>{c.name}</strong>
                  <code>{c.hex}</code>
                  <small>{c.desc}</small>
                </div>
              </div>
            ))}
          </div>
        )}

        {title === 'Typography' && (
          <div className="typography-demo">
            <h1>h1. Heading 1 — Inter Typography (32px)</h1>
            <h2>h2. Heading 2 — Subheading (24px)</h2>
            <h3>h3. Heading 3 — Panel Title (20px)</h3>
            <h4>h4. Heading 4 — Card Title (16px)</h4>
            <p>
              Body text: Font chữ cơ bản 16px, line-height 1.5, tối ưu khả năng đọc trên dashboard phân tích dữ liệu.
            </p>
          </div>
        )}

        {title !== 'Colors' && title !== 'Typography' && (
          <div className="placeholder-info-box">
            <div className="placeholder-icon">📦</div>
            <h4>{title} Component Preview</h4>
            <p>Mô-đun đang hoạt động ở chế độ tiêu chuẩn CoreUI Free UI Suite.</p>
          </div>
        )}
      </div>
    </div>
  );
}

import React from 'react';

export default function HotelHousekeeping({ housekeeping, onUpdateTaskStatus }) {
  return (
    <div className="tab-housekeeping">
      <div className="page-header flex-between">
        <div>
          <h2>Quản Lý Buồng Phòng & Bảo Trì</h2>
          <p>Phân công công việc dọn dẹp và kiểm tra trạng thái phòng</p>
        </div>
      </div>

      <div className="panel">
        <table className="custom-table">
          <thead>
            <tr>
              <th>Số Phòng</th>
              <th>Loại Nhiệm Vụ</th>
              <th>Độ Ưu Tiên</th>
              <th>Nhân Viên Phụ Trách</th>
              <th>Ghi Chú</th>
              <th>Trạng Thái</th>
              <th>Cập Nhật</th>
            </tr>
          </thead>
          <tbody>
            {housekeeping.map(task => (
              <tr key={task.id}>
                <td><span className="room-pill">P.{task.roomNumber}</span></td>
                <td>{task.taskType}</td>
                <td><span className={`priority-badge priority-${task.priority.toLowerCase()}`}>{task.priority}</span></td>
                <td>{task.assignedTo || 'Chưa phân công'}</td>
                <td>{task.note}</td>
                <td><span className={`status-badge ${task.status.toLowerCase()}`}>{task.status}</span></td>
                <td>
                  <select
                    className="form-control-sm"
                    value={task.status}
                    onChange={(e) => onUpdateTaskStatus(task.id, e.target.value)}
                  >
                    <option value="Pending">Pending (Chờ)</option>
                    <option value="InProgress">InProgress (Đang dọn)</option>
                    <option value="Completed">Completed (Hoàn tất)</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

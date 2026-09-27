import tkinter as tk
from tkinter import ttk, messagebox
from datetime import datetime, date
from mysql.connector import Error

import sys
import os

BASE_DIR = os.path.dirname(
    os.path.dirname(
        os.path.dirname(
            os.path.abspath(__file__)
        )
    )
)

if BASE_DIR not in sys.path:
    sys.path.append(BASE_DIR)

from db import get_connection


COLOR_BG = "#f4f6f8"
COLOR_CARD = "#ffffff"
COLOR_BORDER = "#dfe3e8"
COLOR_PRIMARY = "#1f3a5f"
COLOR_PRIMARY_DARK = "#152a45"
COLOR_TEXT = "#2c3e50"
COLOR_MUTED = "#7f8c8d"

STATUS_COLORS = {
    "New": "#c0392b",
    "Contacted": "#2980b9",
    "Closed": "#7f8c8d",
}

STATUS_LABELS_VI = {
    "New": "Mới",
    "Contacted": "Đã liên hệ",
    "Closed": "Đã đóng",
}

FONT_TITLE = ("Segoe UI", 15, "bold")
FONT_HEADING = ("Segoe UI", 10, "bold")
FONT_BODY = ("Segoe UI", 10)
FONT_SMALL = ("Segoe UI", 9)


def format_datetime_vi(value):
    if value is None:
        return "-"

    if isinstance(value, datetime):
        return value.strftime("%d/%m/%Y %H:%M")

    if isinstance(value, date):
        return value.strftime("%d/%m/%Y")

    return str(value)


# Lấy danh sách yêu cầu tư vấn (kèm thông tin phòng)
def get_consultation_requests():
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    query = """
        SELECT
            cr.id,
            cr.room_id,
            r.room_number,
            r.room_type,
            cr.full_name,
            cr.phone,
            cr.email,
            cr.note,
            cr.status,
            cr.created_at
        FROM consultation_requests cr
        JOIN rooms r ON cr.room_id = r.id
        ORDER BY cr.created_at DESC
    """

    cursor.execute(query)
    result = cursor.fetchall()

    cursor.close()
    conn.close()

    return result


# Đếm số yêu cầu đang ở trạng thái "Mới" (dùng cho badge sidebar)
def count_new_requests():
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute(
        "SELECT COUNT(*) FROM consultation_requests WHERE status = 'New'"
    )

    count = cursor.fetchone()[0]

    cursor.close()
    conn.close()

    return count


# Đánh dấu đã liên hệ
def mark_contacted(request_id):
    conn = get_connection()
    cursor = conn.cursor()

    try:
        cursor.execute(
            "SELECT status FROM consultation_requests WHERE id = %s",
            (request_id,)
        )

        row = cursor.fetchone()

        if not row:
            return False, "Không tìm thấy yêu cầu tư vấn."

        if row[0] == "Closed":
            return False, "Yêu cầu này đã được đóng."

        cursor.execute(
            "UPDATE consultation_requests SET status = 'Contacted' WHERE id = %s",
            (request_id,)
        )

        conn.commit()

        return True, "Đã đánh dấu là đã liên hệ."

    except Error as e:
        conn.rollback()
        return False, f"Lỗi khi cập nhật: {e}"

    finally:
        cursor.close()
        conn.close()


# Đóng yêu cầu (đã xử lý xong, không cần theo dõi nữa)
def close_request(request_id):
    conn = get_connection()
    cursor = conn.cursor()

    try:
        cursor.execute(
            "SELECT status FROM consultation_requests WHERE id = %s",
            (request_id,)
        )

        row = cursor.fetchone()

        if not row:
            return False, "Không tìm thấy yêu cầu tư vấn."

        cursor.execute(
            "UPDATE consultation_requests SET status = 'Closed' WHERE id = %s",
            (request_id,)
        )

        conn.commit()

        return True, "Đã đóng yêu cầu."

    except Error as e:
        conn.rollback()
        return False, f"Lỗi khi cập nhật: {e}"

    finally:
        cursor.close()
        conn.close()


# ================== GIAO DIỆN ==================

class ConsultationWindow(tk.Frame):

    def __init__(self, master, *args, **kwargs):
        super().__init__(
            master,
            bg=COLOR_BG,
            *args,
            **kwargs
        )

        self.all_requests = []

        self._setup_style()
        self._build_header()
        self._build_search_bar()
        self._build_table()
        self._build_status_bar()

        self.load_requests()

    def _setup_style(self):
        style = ttk.Style(self)
        style.theme_use("clam")

        style.configure(
            "TCombobox",
            padding=4,
            font=FONT_BODY
        )

        style.configure(
            "Treeview",
            font=FONT_BODY,
            rowheight=28,
            background=COLOR_CARD,
            fieldbackground=COLOR_CARD,
            borderwidth=0,
        )

        style.configure(
            "Treeview.Heading",
            font=FONT_HEADING,
            background="#eef1f4",
            foreground=COLOR_TEXT,
            relief="flat"
        )

        style.map(
            "Treeview",
            background=[("selected", "#d6e4f0")],
            foreground=[("selected", COLOR_TEXT)]
        )

        button_specs = {
            "Contacted": ("#2980b9", "#1f618d"),
            "Close": ("#7f8c8d", "#616a6b"),
            "Search": ("#1f3a5f", "#152a45"),
            "Reset": ("#7f8c8d", "#616a6b"),
        }

        for name, (base, active) in button_specs.items():
            style.configure(
                f"{name}.TButton",
                background=base,
                foreground="white",
                font=FONT_BODY,
                padding=(12, 7),
                borderwidth=0,
                focusthickness=0
            )

            style.map(
                f"{name}.TButton",
                background=[("active", active)]
            )

    # ---------- Header ----------
    def _build_header(self):
        header = tk.Frame(
            self,
            bg=COLOR_PRIMARY,
            height=56
        )

        header.pack(
            fill="x",
            side="top"
        )

        header.pack_propagate(False)

        back_button = tk.Button(
            header,
            text="← Quay về",
            command=self.go_back,
            bg=COLOR_PRIMARY,
            fg="white",
            activebackground=COLOR_PRIMARY_DARK,
            activeforeground="white",
            relief="flat",
            bd=0,
            font=("Segoe UI", 10, "bold"),
            cursor="hand2"
        )

        back_button.pack(
            side="right",
            padx=20
        )

        tk.Label(
            header,
            text="YÊU CẦU TƯ VẤN",
            font=FONT_TITLE,
            bg=COLOR_PRIMARY,
            fg="white"
        ).pack(
            side="left",
            padx=15
        )

    def go_back(self):
        self.master.destroy()

    # ---------- Thanh tìm kiếm / lọc ----------
    def _build_search_bar(self):
        outer = tk.Frame(
            self,
            bg=COLOR_BG
        )

        outer.pack(
            fill="x",
            padx=16,
            pady=(14, 8)
        )

        card = tk.Frame(
            outer,
            bg=COLOR_CARD,
            highlightbackground=COLOR_BORDER,
            highlightthickness=1
        )

        card.pack(fill="x")

        inner = tk.Frame(
            card,
            bg=COLOR_CARD
        )

        inner.pack(
            fill="x",
            padx=16,
            pady=10
        )

        tk.Label(
            inner,
            text="Tìm kiếm (tên / sđt / email / phòng):",
            font=FONT_BODY,
            bg=COLOR_CARD,
            fg=COLOR_MUTED
        ).pack(side="left")

        self.entry_search = tk.Entry(
            inner,
            font=FONT_BODY,
            relief="solid",
            borderwidth=1,
            width=25
        )

        self.entry_search.pack(
            side="left",
            padx=(8, 20),
            ipady=3
        )

        self.entry_search.bind(
            "<Return>",
            lambda e: self.apply_filters()
        )

        tk.Label(
            inner,
            text="Trạng thái:",
            font=FONT_BODY,
            bg=COLOR_CARD,
            fg=COLOR_MUTED
        ).pack(side="left")

        self.cb_status_filter = ttk.Combobox(
            inner,
            state="readonly",
            font=FONT_BODY,
            width=16,
            values=["Tất cả"] + list(STATUS_LABELS_VI.values())
        )

        self.cb_status_filter.current(0)

        self.cb_status_filter.pack(
            side="left",
            padx=(8, 20)
        )

        ttk.Button(
            inner,
            text="Tìm",
            style="Search.TButton",
            command=self.apply_filters
        ).pack(side="left")

        toolbar = tk.Frame(
            card,
            bg=COLOR_CARD
        )

        toolbar.pack(
            fill="x",
            padx=16,
            pady=(0, 12)
        )

        ttk.Button(
            toolbar,
            text="Đánh dấu đã liên hệ",
            style="Contacted.TButton",
            command=self.on_mark_contacted
        ).pack(
            side="left",
            padx=(0, 8)
        )

        ttk.Button(
            toolbar,
            text="Đóng yêu cầu",
            style="Close.TButton",
            command=self.on_close_request
        ).pack(
            side="left",
            padx=8
        )

        ttk.Button(
            toolbar,
            text="Làm mới",
            style="Reset.TButton",
            command=self.on_reset
        ).pack(
            side="left",
            padx=8
        )

    # ---------- Bảng danh sách ----------
    def _build_table(self):
        outer = tk.Frame(
            self,
            bg=COLOR_BG
        )

        outer.pack(
            fill="both",
            expand=True,
            padx=16,
            pady=(0, 8)
        )

        card = tk.Frame(
            outer,
            bg=COLOR_CARD,
            highlightbackground=COLOR_BORDER,
            highlightthickness=1
        )

        card.pack(
            fill="both",
            expand=True
        )

        columns = (
            "id",
            "room",
            "full_name",
            "phone",
            "email",
            "note",
            "status",
            "created_at"
        )

        headers = {
            "id": "Mã YC",
            "room": "Phòng",
            "full_name": "Họ tên",
            "phone": "Số điện thoại",
            "email": "Email",
            "note": "Ghi chú",
            "status": "Trạng thái",
            "created_at": "Thời gian gửi"
        }

        widths = {
            "id": 60,
            "room": 110,
            "full_name": 140,
            "phone": 120,
            "email": 170,
            "note": 200,
            "status": 110,
            "created_at": 140
        }

        table_wrap = tk.Frame(
            card,
            bg=COLOR_CARD
        )

        table_wrap.pack(
            fill="both",
            expand=True,
            padx=12,
            pady=12
        )

        self.tree = ttk.Treeview(
            table_wrap,
            columns=columns,
            show="headings"
        )

        hsb = ttk.Scrollbar(
            table_wrap,
            orient="horizontal",
            command=self.tree.xview
        )

        self.tree.configure(
            xscrollcommand=hsb.set
        )

        for col in columns:
            anchor = "w" if col in ("full_name", "email", "note") else "center"

            self.tree.heading(
                col,
                text=headers[col]
            )

            self.tree.column(
                col,
                width=widths[col],
                anchor=anchor
            )

        vsb = ttk.Scrollbar(
            table_wrap,
            orient="vertical",
            command=self.tree.yview
        )

        self.tree.configure(
            yscrollcommand=vsb.set
        )

        self.tree.pack(
            side="top",
            fill="both",
            expand=True
        )

        vsb.pack(
            side="right",
            fill="y"
        )

        hsb.pack(
            side="bottom",
            fill="x"
        )

        self.tree.tag_configure(
            "oddrow",
            background="#f7f9fb"
        )

        self.tree.tag_configure(
            "evenrow",
            background=COLOR_CARD
        )

        for status, color in STATUS_COLORS.items():
            self.tree.tag_configure(
                status,
                foreground=color,
                font=("Segoe UI", 10, "bold")
            )

    # ---------- Thanh trạng thái dưới cùng ----------
    def _build_status_bar(self):
        bar = tk.Frame(
            self,
            bg="#eef1f4",
            height=28
        )

        bar.pack(
            fill="x",
            side="bottom"
        )

        bar.pack_propagate(False)

        self.lbl_status = tk.Label(
            bar,
            text="Sẵn sàng.",
            font=FONT_SMALL,
            bg="#eef1f4",
            fg=COLOR_MUTED,
            anchor="w"
        )

        self.lbl_status.pack(
            side="left",
            padx=16
        )

        self.lbl_count = tk.Label(
            bar,
            text="0 yêu cầu",
            font=FONT_SMALL,
            bg="#eef1f4",
            fg=COLOR_MUTED,
            anchor="e"
        )

        self.lbl_count.pack(
            side="right",
            padx=16
        )

    def set_status(self, text):
        self.lbl_status.config(text=text)

    # ---------- Nạp danh sách ----------
    def load_requests(self):
        try:
            self.all_requests = get_consultation_requests()
            self.render_rows(self.all_requests)
            self.set_status("Đã tải danh sách yêu cầu tư vấn.")

        except Error as e:
            messagebox.showerror(
                "Lỗi",
                f"Không thể tải dữ liệu: {e}"
            )

    def render_rows(self, requests):
        self.tree.delete(*self.tree.get_children())

        for i, r in enumerate(requests):
            row_tag = "evenrow" if i % 2 == 0 else "oddrow"

            self.tree.insert(
                "",
                "end",
                iid=str(r["id"]),
                values=(
                    r["id"],
                    f"{r['room_number']} - {r['room_type']}",
                    r["full_name"] or "-",
                    r["phone"] or "-",
                    r["email"] or "-",
                    r["note"] or "-",
                    STATUS_LABELS_VI.get(r["status"], r["status"]),
                    format_datetime_vi(r["created_at"])
                ),
                tags=(row_tag, r["status"])
            )

        self.lbl_count.config(
            text=f"{len(requests)} yêu cầu"
        )

    # ---------- Tìm kiếm / lọc ----------
    def apply_filters(self):
        keyword = self.entry_search.get().strip().lower()
        status_label = self.cb_status_filter.get()

        filtered = self.all_requests

        if keyword:
            filtered = [
                r for r in filtered
                if keyword in (r["full_name"] or "").lower()
                or keyword in (r["phone"] or "").lower()
                or keyword in (r["email"] or "").lower()
                or keyword in f"{r['room_number']} {r['room_type']}".lower()
            ]

        if status_label != "Tất cả":
            filtered = [
                r for r in filtered
                if STATUS_LABELS_VI.get(r["status"], r["status"]) == status_label
            ]

        self.render_rows(filtered)
        self.set_status(f"Tìm thấy {len(filtered)} kết quả.")

    def on_reset(self):
        self.entry_search.delete(0, tk.END)
        self.cb_status_filter.current(0)
        self.load_requests()

    def get_selected_id(self):
        selected = self.tree.focus()

        if not selected:
            messagebox.showwarning(
                "Thông báo",
                "Vui lòng chọn một yêu cầu trong danh sách."
            )
            return None

        return int(selected)

    # ---------- Đánh dấu đã liên hệ ----------
    def on_mark_contacted(self):
        request_id = self.get_selected_id()

        if request_id is None:
            return

        ok, msg = mark_contacted(request_id)

        self.set_status(msg)

        if ok:
            messagebox.showinfo("Thành công", msg)
            self.load_requests()
        else:
            messagebox.showerror("Lỗi", msg)

    # ---------- Đóng yêu cầu ----------
    def on_close_request(self):
        request_id = self.get_selected_id()

        if request_id is None:
            return

        if not messagebox.askyesno(
            "Xác nhận",
            "Bạn có chắc muốn đóng yêu cầu này không?"
        ):
            return

        ok, msg = close_request(request_id)

        self.set_status(msg)

        if ok:
            messagebox.showinfo("Thành công", msg)
            self.load_requests()
        else:
            messagebox.showerror("Lỗi", msg)


if __name__ == "__main__":
    root = tk.Tk()

    root.title("Yêu cầu tư vấn - Khách sạn")

    root.geometry("1100x600")

    root.configure(bg=COLOR_BG)

    window = ConsultationWindow(root)

    window.pack(
        fill="both",
        expand=True
    )

    root.mainloop()
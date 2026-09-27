import tkinter as tk
from tkinter import ttk, messagebox
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))
from db import get_connection

from mysql.connector import Error

COLOR_BG = "#f4f6f8"
COLOR_CARD = "#ffffff"
COLOR_BORDER = "#dfe3e8"
COLOR_PRIMARY = "#1f3a5f"
COLOR_PRIMARY_DARK = "#152a45"
COLOR_TEXT = "#2c3e50"
COLOR_MUTED = "#7f8c8d"

FONT_TITLE = ("Segoe UI", 15, "bold")
FONT_HEADING = ("Segoe UI", 10, "bold")
FONT_BODY = ("Segoe UI", 10)
FONT_SMALL = ("Segoe UI", 9)


# ================== CÁC HÀM XỬ LÝ DATABASE ==================

def get_customers():
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    query = "SELECT id, name, email, phone, address, id_type, id_number FROM customers ORDER BY id DESC"
    cursor.execute(query)
    result = cursor.fetchall()
    cursor.close()
    conn.close()
    return result


def add_customer(name, email, phone, address, id_type, id_number):
    if not name or not email or not phone or not id_number:
        return False, "Họ tên, Email, Số điện thoại và Số giấy tờ không được để trống."
    
    conn = get_connection()
    cursor = conn.cursor()
    try:
        # Kiểm tra trùng email
        cursor.execute("SELECT id FROM customers WHERE email = %s", (email,))
        if cursor.fetchone():
            return False, "Email đã tồn tại trong hệ thống."
        
        # Kiểm tra trùng số điện thoại
        cursor.execute("SELECT id FROM customers WHERE phone = %s", (phone,))
        if cursor.fetchone():
            return False, "Số điện thoại đã tồn tại trong hệ thống."
        
        # Kiểm tra trùng số giấy tờ
        cursor.execute("SELECT id FROM customers WHERE id_number = %s", (id_number,))
        if cursor.fetchone():
            return False, "Số giấy tờ (CCCD/Passport) đã tồn tại."

        query = """INSERT INTO customers (name, email, phone, address, id_type, id_number)
                   VALUES (%s, %s, %s, %s, %s, %s)"""
        cursor.execute(query, (name, email, phone, address, id_type, id_number))
        conn.commit()
        return True, "Thêm khách hàng thành công."
    except Error as e:
        conn.rollback()
        return False, f"Lỗi khi thêm khách hàng: {e}"
    finally:
        cursor.close()
        conn.close()


def update_customer(customer_id, name, email, phone, address, id_type, id_number):
    if not name or not email or not phone or not id_number:
        return False, "Họ tên, Email, Số điện thoại và Số giấy tờ không được để trống."
    
    conn = get_connection()
    cursor = conn.cursor()
    try:
        # Kiểm tra trùng email với các khách hàng khác
        cursor.execute("SELECT id FROM customers WHERE email = %s AND id != %s", (email, customer_id))
        if cursor.fetchone():
            return False, "Email đã tồn tại trong hệ thống."
        
        # Kiểm tra trùng số điện thoại với các khách hàng khác
        cursor.execute("SELECT id FROM customers WHERE phone = %s AND id != %s", (phone, customer_id))
        if cursor.fetchone():
            return False, "Số điện thoại đã tồn tại trong hệ thống."
        
        # Kiểm tra trùng số giấy tờ với các khách hàng khác
        cursor.execute("SELECT id FROM customers WHERE id_number = %s AND id != %s", (id_number, customer_id))
        if cursor.fetchone():
            return False, "Số giấy tờ (CCCD/Passport) đã tồn tại."

        query = """UPDATE customers 
                   SET name = %s, email = %s, phone = %s, address = %s, id_type = %s, id_number = %s
                   WHERE id = %s"""
        cursor.execute(query, (name, email, phone, address, id_type, id_number, customer_id))
        conn.commit()
        return True, "Cập nhật thông tin khách hàng thành công."
    except Error as e:
        conn.rollback()
        return False, f"Lỗi khi cập nhật khách hàng: {e}"
    finally:
        cursor.close()
        conn.close()


def delete_customer(customer_id):
    conn = get_connection()
    cursor = conn.cursor()
    try:
        # Kiểm tra xem khách hàng có liên kết với đặt phòng nào không
        cursor.execute("SELECT id FROM bookings WHERE customer_id = %s LIMIT 1", (customer_id,))
        if cursor.fetchone():
            return False, "Không thể xóa khách hàng này vì đang có thông tin đặt phòng liên kết."

        cursor.execute("DELETE FROM customers WHERE id = %s", (customer_id,))
        conn.commit()
        return True, "Xóa khách hàng thành công."
    except Error as e:
        conn.rollback()
        return False, f"Lỗi khi xóa khách hàng: {e}"
    finally:
        cursor.close()
        conn.close()


def search_customers(keyword):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    query = """SELECT id, name, email, phone, address, id_type, id_number 
               FROM customers 
               WHERE name LIKE %s OR email LIKE %s OR phone LIKE %s OR id_number LIKE %s 
               ORDER BY id DESC"""
    like_keyword = f"%{keyword}%"
    cursor.execute(query, (like_keyword, like_keyword, like_keyword, like_keyword))
    result = cursor.fetchall()
    cursor.close()
    conn.close()
    return result


# ================== GIAO DIỆN ==================

class CustomerWindow(tk.Frame):

    def __init__(self, master, *args, **kwargs):
        super().__init__(master, bg=COLOR_BG, *args, **kwargs)

        self.all_customers = []

        self._setup_style()
        self._build_header()
        self._build_form_card()
        self._build_search_bar()
        self._build_table()
        self._build_status_bar()

        self.load_customers()

    def _setup_style(self):
        style = ttk.Style(self)
        style.theme_use("clam")

        style.configure("TCombobox", padding=4, font=FONT_BODY)

        style.configure(
            "Treeview",
            font=FONT_BODY,
            rowheight=28,
            background=COLOR_CARD,
            fieldbackground=COLOR_CARD,
            borderwidth=0,
        )
        style.configure("Treeview.Heading", font=FONT_HEADING, background="#eef1f4",
                         foreground=COLOR_TEXT, relief="flat")
        style.map("Treeview", background=[("selected", "#d6e4f0")],
                  foreground=[("selected", COLOR_TEXT)])

        # Các style nút theo màu chức năng đồng bộ với booking_window
        button_specs = {
            "Add": ("#27ae60", "#1e8449"),
            "Edit": ("#2980b9", "#1f618d"),
            "Cancel": ("#c0392b", "#96281b"),
            "Reset": ("#7f8c8d", "#616a6b"),
            "Search": ("#1f3a5f", "#152a45"),
        }
        for name, (base, active) in button_specs.items():
            style.configure(f"{name}.TButton", background=base, foreground="white",
                             font=FONT_BODY, padding=(12, 7), borderwidth=0, focusthickness=0)
            style.map(f"{name}.TButton", background=[("active", active)])

    # ---------- Header ----------
    def _build_header(self):
        header = tk.Frame(self, bg=COLOR_PRIMARY, height=56)
        header.pack(fill="x", side="top")
        header.pack_propagate(False)

        tk.Label(header, text="QUẢN LÝ KHÁCH HÀNG", font=FONT_TITLE,
                 bg=COLOR_PRIMARY, fg="white").pack(side="left", padx=20)

    # ---------- Khung nhập liệu (card) ----------
    def _build_form_card(self):
        outer = tk.Frame(self, bg=COLOR_BG)
        outer.pack(fill="x", padx=16, pady=(14, 8))

        card = tk.Frame(outer, bg=COLOR_CARD, highlightbackground=COLOR_BORDER,
                         highlightthickness=1)
        card.pack(fill="x")

        tk.Label(card, text="Thông tin khách hàng", font=FONT_HEADING,
                 bg=COLOR_CARD, fg=COLOR_TEXT).grid(
            row=0, column=0, columnspan=4, sticky="w", padx=16, pady=(12, 6))

        form = tk.Frame(card, bg=COLOR_CARD)
        form.grid(row=1, column=0, columnspan=4, sticky="ew", padx=16, pady=(0, 4))
        for c in (1, 3):
            form.columnconfigure(c, weight=1)

        # Hàng 1: Họ tên - Email
        self._field_label(form, "Họ tên *", 0, 0)
        self.entry_name = tk.Entry(form, font=FONT_BODY, relief="solid",
                                    borderwidth=1, highlightthickness=0)
        self.entry_name.grid(row=0, column=1, sticky="ew", padx=(0, 20), pady=6, ipady=3)

        self._field_label(form, "Email *", 0, 2)
        self.entry_email = tk.Entry(form, font=FONT_BODY, relief="solid",
                                     borderwidth=1, highlightthickness=0)
        self.entry_email.grid(row=0, column=3, sticky="ew", pady=6, ipady=3)

        # Hàng 2: Số điện thoại - Địa chỉ
        self._field_label(form, "Số điện thoại *", 1, 0)
        self.entry_phone = tk.Entry(form, font=FONT_BODY, relief="solid",
                                     borderwidth=1, highlightthickness=0)
        self.entry_phone.grid(row=1, column=1, sticky="ew", padx=(0, 20), pady=6, ipady=3)

        self._field_label(form, "Địa chỉ", 1, 2)
        self.entry_address = tk.Entry(form, font=FONT_BODY, relief="solid",
                                       borderwidth=1, highlightthickness=0)
        self.entry_address.grid(row=1, column=3, sticky="ew", pady=6, ipady=3)

        # Hàng 3: Loại giấy tờ - Số giấy tờ
        self._field_label(form, "Loại giấy tờ", 2, 0)
        self.cb_id_type = ttk.Combobox(form, state="readonly", font=FONT_BODY, values=["CCCD", "Passport"])
        self.cb_id_type.grid(row=2, column=1, sticky="ew", padx=(0, 20), pady=(6, 12))
        self.cb_id_type.current(0)

        self._field_label(form, "Số giấy tờ *", 2, 2)
        self.entry_id_number = tk.Entry(form, font=FONT_BODY, relief="solid",
                                         borderwidth=1, highlightthickness=0)
        self.entry_id_number.grid(row=2, column=3, sticky="ew", pady=(6, 12), ipady=3)

        # Toolbar nút chức năng
        toolbar = tk.Frame(card, bg=COLOR_CARD)
        toolbar.grid(row=2, column=0, columnspan=4, sticky="w", padx=16, pady=(4, 14))

        ttk.Button(toolbar, text="+ Thêm khách hàng", style="Add.TButton",
                   command=self.on_add).pack(side="left", padx=(0, 8))
        ttk.Button(toolbar, text="Cập nhật", style="Edit.TButton",
                   command=self.on_edit).pack(side="left", padx=8)
        ttk.Button(toolbar, text="Xóa", style="Cancel.TButton",
                   command=self.on_delete).pack(side="left", padx=8)
        ttk.Button(toolbar, text="Làm mới", style="Reset.TButton",
                   command=self.on_reset).pack(side="left", padx=8)

    def _field_label(self, parent, text, row, col):
        tk.Label(parent, text=text, font=FONT_BODY, bg=COLOR_CARD,
                 fg=COLOR_MUTED, anchor="w").grid(row=row, column=col, sticky="w", pady=6)

    # ---------- Thanh tìm kiếm ----------
    def _build_search_bar(self):
        outer = tk.Frame(self, bg=COLOR_BG)
        outer.pack(fill="x", padx=16, pady=(0, 8))

        card = tk.Frame(outer, bg=COLOR_CARD, highlightbackground=COLOR_BORDER,
                         highlightthickness=1)
        card.pack(fill="x")

        inner = tk.Frame(card, bg=COLOR_CARD)
        inner.pack(fill="x", padx=16, pady=10)

        tk.Label(inner, text="Tìm kiếm khách hàng (Tên, Email, SĐT, Số giấy tờ):", font=FONT_BODY,
                 bg=COLOR_CARD, fg=COLOR_MUTED).pack(side="left")
        self.entry_search = tk.Entry(inner, font=FONT_BODY, relief="solid",
                                      borderwidth=1, width=35)
        self.entry_search.pack(side="left", padx=(8, 20), ipady=3)
        self.entry_search.bind("<Return>", lambda e: self.apply_filters())

        ttk.Button(inner, text="Tìm", style="Search.TButton",
                   command=self.apply_filters).pack(side="left")

    # ---------- Bảng danh sách khách hàng ----------
    def _build_table(self):
        outer = tk.Frame(self, bg=COLOR_BG)
        outer.pack(fill="both", expand=True, padx=16, pady=(0, 8))

        card = tk.Frame(outer, bg=COLOR_CARD, highlightbackground=COLOR_BORDER,
                         highlightthickness=1)
        card.pack(fill="both", expand=True)

        columns = ("id", "name", "email", "phone", "address", "id_type", "id_number")
        headers = {
            "id": "Mã KH", "name": "Họ và tên", "email": "Email",
            "phone": "Số điện thoại", "address": "Địa chỉ",
            "id_type": "Loại giấy tờ", "id_number": "Số giấy tờ"
        }
        widths = {
            "id": 60, "name": 180, "email": 180, "phone": 120,
            "address": 220, "id_type": 100, "id_number": 120
        }

        table_wrap = tk.Frame(card, bg=COLOR_CARD)
        table_wrap.pack(fill="both", expand=True, padx=12, pady=12)

        self.tree = ttk.Treeview(table_wrap, columns=columns, show="headings")
        for col in columns:
            anchor = "w" if col in ("name", "email", "address") else "center"
            self.tree.heading(col, text=headers[col])
            self.tree.column(col, width=widths[col], anchor=anchor)

        vsb = ttk.Scrollbar(table_wrap, orient="vertical", command=self.tree.yview)
        self.tree.configure(yscrollcommand=vsb.set)
        self.tree.pack(side="left", fill="both", expand=True)
        vsb.pack(side="right", fill="y")

        self.tree.tag_configure("oddrow", background="#f7f9fb")
        self.tree.tag_configure("evenrow", background=COLOR_CARD)

        self.tree.bind("<<TreeviewSelect>>", self.on_select_row)

    # ---------- Thanh trạng thái ----------
    def _build_status_bar(self):
        bar = tk.Frame(self, bg="#eef1f4", height=28)
        bar.pack(fill="x", side="bottom")
        bar.pack_propagate(False)

        self.lbl_status = tk.Label(bar, text="Sẵn sàng.", font=FONT_SMALL,
                                    bg="#eef1f4", fg=COLOR_MUTED, anchor="w")
        self.lbl_status.pack(side="left", padx=16)

        self.lbl_count = tk.Label(bar, text="0 khách hàng", font=FONT_SMALL,
                                   bg="#eef1f4", fg=COLOR_MUTED, anchor="e")
        self.lbl_count.pack(side="right", padx=16)

    def set_status(self, text):
        self.lbl_status.config(text=text)

    # ---------- Tải dữ liệu khách hàng ----------
    def load_customers(self):
        try:
            self.all_customers = get_customers()
        except Error as e:
            messagebox.showerror("Lỗi", f"Không thể tải danh sách khách hàng: {e}")
            self.all_customers = []
        self.render_rows(self.all_customers)
        self.set_status("Đã tải danh sách khách hàng.")

    def render_rows(self, customers):
        for row in self.tree.get_children():
            self.tree.delete(row)

        for i, c in enumerate(customers):
            stripe = "evenrow" if i % 2 == 0 else "oddrow"
            self.tree.insert("", "end", iid=c["id"], tags=(stripe,), values=(
                c["id"],
                c["name"],
                c["email"],
                c["phone"] if c["phone"] else "-",
                c["address"] if c["address"] else "-",
                c["id_type"],
                c["id_number"] if c["id_number"] else "-"
            ))
        self.lbl_count.config(text=f"{len(customers)} khách hàng")

    # ---------- Tìm kiếm và lọc ----------
    def apply_filters(self):
        keyword = self.entry_search.get().strip()
        if keyword:
            try:
                filtered = search_customers(keyword)
            except Error as e:
                messagebox.showerror("Lỗi", f"Không thể tìm kiếm khách hàng: {e}")
                return
        else:
            filtered = self.all_customers

        self.render_rows(filtered)
        self.set_status(f"Tìm thấy {len(filtered)} khách hàng.")

    # ---------- Chọn một hàng trong bảng ----------
    def on_select_row(self, event):
        selected = self.tree.focus()
        if not selected:
            return
        customer_id = int(selected)
        customer = next((c for c in self.all_customers if c["id"] == customer_id), None)
        if not customer:
            return

        # Điền dữ liệu vào các ô nhập
        self.entry_name.delete(0, tk.END)
        self.entry_name.insert(0, customer["name"])

        self.entry_email.delete(0, tk.END)
        self.entry_email.insert(0, customer["email"])

        self.entry_phone.delete(0, tk.END)
        self.entry_phone.insert(0, customer["phone"] if customer["phone"] else "")

        self.entry_address.delete(0, tk.END)
        self.entry_address.insert(0, customer["address"] if customer["address"] else "")

        self.cb_id_type.set(customer["id_type"])

        self.entry_id_number.delete(0, tk.END)
        self.entry_id_number.insert(0, customer["id_number"] if customer["id_number"] else "")

    def get_selected_id(self):
        selected = self.tree.focus()
        if not selected:
            messagebox.showwarning("Thông báo", "Vui lòng chọn một khách hàng trong danh sách.")
            return None
        return int(selected)

    def on_reset(self):
        self.entry_name.delete(0, tk.END)
        self.entry_email.delete(0, tk.END)
        self.entry_phone.delete(0, tk.END)
        self.entry_address.delete(0, tk.END)
        self.cb_id_type.current(0)
        self.entry_id_number.delete(0, tk.END)
        self.entry_search.delete(0, tk.END)
        self.load_customers()

    # ---------- Thêm ----------
    def on_add(self):
        name = self.entry_name.get().strip()
        email = self.entry_email.get().strip()
        phone = self.entry_phone.get().strip()
        address = self.entry_address.get().strip()
        id_type = self.cb_id_type.get()
        id_number = self.entry_id_number.get().strip()

        if not name or not email or not phone or not id_number:
            messagebox.showwarning("Thông báo", "Vui lòng điền đầy đủ các thông tin bắt buộc (*).")
            return

        ok, msg = add_customer(name, email, phone, address, id_type, id_number)
        self.set_status(msg)
        if ok:
            messagebox.showinfo("Thành công", msg)
            self.on_reset()
        else:
            messagebox.showerror("Lỗi", msg)

    # ---------- Cập nhật ----------
    def on_edit(self):
        customer_id = self.get_selected_id()
        if customer_id is None:
            return

        name = self.entry_name.get().strip()
        email = self.entry_email.get().strip()
        phone = self.entry_phone.get().strip()
        address = self.entry_address.get().strip()
        id_type = self.cb_id_type.get()
        id_number = self.entry_id_number.get().strip()

        if not name or not email or not phone or not id_number:
            messagebox.showwarning("Thông báo", "Vui lòng điền đầy đủ các thông tin bắt buộc (*).")
            return

        ok, msg = update_customer(customer_id, name, email, phone, address, id_type, id_number)
        self.set_status(msg)
        if ok:
            messagebox.showinfo("Thành công", msg)
            self.load_customers()
        else:
            messagebox.showerror("Lỗi", msg)

    # ---------- Xóa ----------
    def on_delete(self):
        customer_id = self.get_selected_id()
        if customer_id is None:
            return

        if not messagebox.askyesno("Xác nhận", "Bạn có chắc chắn muốn xóa khách hàng này không?"):
            return

        ok, msg = delete_customer(customer_id)
        self.set_status(msg)
        if ok:
            messagebox.showinfo("Thành công", msg)
            self.on_reset()
        else:
            messagebox.showerror("Lỗi", msg)


if __name__ == "__main__":
    root = tk.Tk()
    root.title("Quản lý Khách hàng - Khách sạn")
    root.geometry("1100x650")
    root.configure(bg=COLOR_BG)

    window = CustomerWindow(root)
    window.pack(fill="both", expand=True)

    root.mainloop()
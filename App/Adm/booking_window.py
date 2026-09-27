import tkinter as tk
from tkinter import ttk, messagebox
from datetime import datetime, date
from mysql.connector import Error

from booking_supply_window import open_booking_supply_window

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
    "Booked": "#2980b9",
    "CheckedIn": "#27ae60",
    "CheckedOut": "#7f8c8d",
    "Cancelled": "#c0392b",
}

STATUS_LABELS_VI = {
    "Booked": "Đã đặt",
    "CheckedIn": "Đang lưu trú",
    "CheckedOut": "Đã trả phòng",
    "Cancelled": "Đã hủy",
}

# Khớp với ROOM_TYPE_VI trong room_window.py — DB vẫn lưu tiếng Anh,
# chỉ dịch khi hiển thị lên giao diện.
ROOM_TYPE_VI = {
    "Standard": "Tiêu chuẩn",
    "Deluxe": "Cao cấp",
    "Suite": "Hạng sang",
}

FONT_TITLE = ("Segoe UI", 15, "bold")
FONT_HEADING = ("Segoe UI", 10, "bold")
FONT_BODY = ("Segoe UI", 10)
FONT_SMALL = ("Segoe UI", 9)


def format_date_vi(value):
    if value is None:
        return "-"

    if isinstance(value, datetime):
        return value.strftime("%d/%m/%Y %H:%M")

    if isinstance(value, date):
        return value.strftime("%d/%m/%Y")

    return str(value)


# Kiểm tra ngày check-in / check-out
def parse_and_validate_dates(checkin_text, checkout_text):
    try:
        checkin_d = datetime.strptime(
            checkin_text.strip(),
            "%d/%m/%Y"
        ).date()
    except ValueError:
        return False, "Ngày check-in không đúng định dạng (dd/mm/yyyy).", None, None

    try:
        checkout_d = datetime.strptime(
            checkout_text.strip(),
            "%d/%m/%Y"
        ).date()
    except ValueError:
        return False, "Ngày check-out không đúng định dạng (dd/mm/yyyy).", None, None

    if checkin_d < date.today():
        return False, "Ngày check-in dự kiến phải lớn hơn hoặc bằng ngày hiện tại.", None, None

    if checkin_d > checkout_d:
        return False, "Ngày check-in phải nhỏ hơn hoặc bằng ngày check-out.", None, None

    return True, "", checkin_d, checkout_d


# Lấy danh sách đặt phòng
def get_bookings():
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    query = """
        SELECT
            b.id,
            b.customer_id,
            c.name AS customer_name,
            b.room_id,
            b.room_number,
            b.room_type,
            b.checkin_date,
            b.checkout_date,
            b.actual_checkin,
            b.actual_checkout,
            b.status,
            b.booking_date,
            b.extended_hours,
            b.extra_fee,
            b.room_price
        FROM bookings b
        JOIN customers c ON b.customer_id = c.id
        ORDER BY b.id DESC
    """

    cursor.execute(query)
    result = cursor.fetchall()

    cursor.close()
    conn.close()

    return result


# Thêm mới đặt phòng
def add_booking(customer_id, room_id, checkin_date, checkout_date):
    ok, msg, checkin_d, checkout_d = parse_and_validate_dates(
        checkin_date,
        checkout_date
    )

    if not ok:
        return False, msg

    conn = get_connection()
    cursor = conn.cursor()

    try:
        cursor.execute(
            """
            SELECT status, price, room_number, room_type, image_url
            FROM rooms WHERE id = %s
            """,
            (room_id,)
        )

        room = cursor.fetchone()

        if not room:
            return False, "Phòng không tồn tại."

        if room[0] != "Empty":
            return False, "Phòng hiện không trống, vui lòng chọn phòng khác."

        # Chốt thông tin phòng tại thời điểm đặt phòng (giá, số phòng,
        # loại phòng, ảnh). Hoá đơn/hiển thị booking sau này sẽ dùng
        # các giá trị này, không bị ảnh hưởng nếu admin sửa thông tin
        # phòng sau khi khách đã đặt/nhận phòng.
        room_price = room[1]
        room_number = room[2]
        room_type = room[3]
        room_image_url = room[4]

        cursor.execute(
            """
            INSERT INTO bookings
            (
                customer_id,
                room_id,
                room_price,
                room_number,
                room_type,
                room_image_url,
                checkin_date,
                checkout_date,
                status
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, 'Booked')
            """,
            (
                customer_id,
                room_id,
                room_price,
                room_number,
                room_type,
                room_image_url,
                checkin_d,
                checkout_d
            )
        )

        cursor.execute(
            "UPDATE rooms SET status = 'Booked' WHERE id = %s",
            (room_id,)
        )

        conn.commit()

        return True, "Đặt phòng thành công."

    except Error as e:
        conn.rollback()
        return False, f"Lỗi khi đặt phòng: {e}"

    finally:
        cursor.close()
        conn.close()


# Sửa
def edit_booking(booking_id, checkin_date, checkout_date):
    ok, msg, checkin_d, checkout_d = parse_and_validate_dates(
        checkin_date,
        checkout_date
    )

    if not ok:
        return False, msg

    conn = get_connection()
    cursor = conn.cursor()

    try:
        cursor.execute(
            "SELECT status FROM bookings WHERE id = %s",
            (booking_id,)
        )

        row = cursor.fetchone()

        if not row:
            return False, "Không tìm thấy đặt phòng."

        if row[0] not in ("Booked", "CheckedIn"):
            return False, "Chỉ có thể sửa đặt phòng chưa check-out hoặc chưa hủy."

        cursor.execute(
            """
            UPDATE bookings
            SET checkin_date = %s,
                checkout_date = %s
            WHERE id = %s
            """,
            (
                checkin_d,
                checkout_d,
                booking_id
            )
        )

        conn.commit()

        return True, "Cập nhật đặt phòng thành công."

    except Error as e:
        conn.rollback()
        return False, f"Lỗi khi sửa đặt phòng: {e}"

    finally:
        cursor.close()
        conn.close()


# Hủy
def cancel_booking(booking_id):
    conn = get_connection()
    cursor = conn.cursor()

    try:
        cursor.execute(
            """
            SELECT room_id, status
            FROM bookings
            WHERE id = %s
            """,
            (booking_id,)
        )

        row = cursor.fetchone()

        if not row:
            return False, "Không tìm thấy đặt phòng."

        if row[1] != "Booked":
            if row[1] == "CheckedIn":
                return False, "Khách đã check-in, không thể hủy đặt phòng."

            return False, "Đặt phòng này không thể hủy."

        room_id = row[0]

        cursor.execute(
            """
            UPDATE bookings
            SET status = 'Cancelled'
            WHERE id = %s
            """,
            (booking_id,)
        )

        cursor.execute(
            """
            UPDATE rooms
            SET status = 'Empty'
            WHERE id = %s
            """,
            (room_id,)
        )

        conn.commit()

        return True, "Hủy đặt phòng thành công."

    except Error as e:
        conn.rollback()
        return False, f"Lỗi khi hủy đặt phòng: {e}"

    finally:
        cursor.close()
        conn.close()


# Check-in
def checkin(booking_id):
    conn = get_connection()
    cursor = conn.cursor()

    try:
        cursor.execute(
            """
            SELECT room_id, status
            FROM bookings
            WHERE id = %s
            """,
            (booking_id,)
        )

        row = cursor.fetchone()

        if not row:
            return False, "Không tìm thấy đặt phòng."

        if row[1] != "Booked":
            return False, "Chỉ có thể check-in đặt phòng đang ở trạng thái 'Đã đặt'."

        room_id = row[0]

        cursor.execute(
            """
            UPDATE bookings
            SET actual_checkin = %s,
                status = 'CheckedIn'
            WHERE id = %s
            """,
            (
                datetime.now(),
                booking_id
            )
        )

        cursor.execute(
            """
            UPDATE rooms
            SET status = 'Occupied'
            WHERE id = %s
            """,
            (room_id,)
        )

        conn.commit()

        return True, "Check-in thành công."

    except Error as e:
        conn.rollback()
        return False, f"Lỗi khi check-in: {e}"

    finally:
        cursor.close()
        conn.close()


# Check-out
def checkout(booking_id):
    conn = get_connection()
    cursor = conn.cursor()

    # Quy định giờ check-out của khách sạn
    CHECKOUT_HOUR = 12

    # Phụ phí mỗi giờ trả phòng muộn
    LATE_FEE_PER_HOUR = 50000

    try:
        cursor.execute(
            """
            SELECT room_id, status, checkout_date
            FROM bookings
            WHERE id = %s
            """,
            (booking_id,)
        )

        row = cursor.fetchone()

        if not row:
            return False, "Không tìm thấy đặt phòng."

        room_id, status, checkout_date = row

        if status != "CheckedIn":
            return False, "Chỉ có thể check-out đặt phòng đang ở trạng thái 'Đang lưu trú'."

        # Thời gian check-out thực tế
        actual_checkout = datetime.now()

        # Thời gian check-out quy định
        expected_checkout = datetime.combine(
            checkout_date,
            datetime.min.time()
        ).replace(
            hour=CHECKOUT_HOUR
        )

        # Tính số giờ trả phòng muộn
        extended_hours = 0
        extra_fee = 0

        if actual_checkout > expected_checkout:
            late_seconds = (
                actual_checkout - expected_checkout
            ).total_seconds()

            # Làm tròn lên theo giờ
            extended_hours = int(
                (late_seconds + 3600 - 1) // 3600
            )

            extra_fee = extended_hours * LATE_FEE_PER_HOUR

        # Cập nhật booking
        cursor.execute(
            """
            UPDATE bookings
            SET actual_checkout = %s,
                extended_hours = %s,
                extra_fee = %s,
                status = 'CheckedOut'
            WHERE id = %s
            """,
            (
                actual_checkout,
                extended_hours,
                extra_fee,
                booking_id
            )
        )

        # Trả phòng → phòng trở thành trống
        cursor.execute(
            """
            UPDATE rooms
            SET status = 'Empty'
            WHERE id = %s
            """,
            (room_id,)
        )

        conn.commit()

        if extended_hours > 0:
            return True, (
                f"Check-out thành công. "
                f"Khách trả phòng muộn {extended_hours} giờ, "
                f"phụ phí: {extra_fee:,.0f} VNĐ."
            )

        return True, "Check-out thành công."

    except Error as e:
        conn.rollback()
        return False, f"Lỗi khi check-out: {e}"

    finally:
        cursor.close()
        conn.close()


# Đổi phòng
def change_room(booking_id, new_room_id):
    conn = get_connection()
    cursor = conn.cursor()

    try:
        cursor.execute(
            """
            SELECT room_id, status
            FROM bookings
            WHERE id = %s
            """,
            (booking_id,)
        )

        row = cursor.fetchone()

        if not row:
            return False, "Không tìm thấy đặt phòng."

        old_room_id, status = row

        if status not in ("Booked", "CheckedIn"):
            return False, "Chỉ có thể đổi phòng khi đặt phòng đang 'Đã đặt' hoặc 'Đang lưu trú'."

        cursor.execute(
            """
            SELECT status, price, room_number, room_type, image_url
            FROM rooms
            WHERE id = %s
            """,
            (new_room_id,)
        )

        new_room = cursor.fetchone()

        if not new_room:
            return False, "Phòng mới không tồn tại."

        if new_room[0] != "Empty":
            return False, "Phòng mới hiện không trống."

        # Chốt lại toàn bộ thông tin theo phòng mới tại thời điểm đổi
        # phòng (snapshot mới), cùng nguyên tắc với lúc đặt phòng.
        new_room_price = new_room[1]
        new_room_number = new_room[2]
        new_room_type = new_room[3]
        new_room_image_url = new_room[4]

        cursor.execute(
            """
            UPDATE bookings
            SET room_id = %s,
                room_price = %s,
                room_number = %s,
                room_type = %s,
                room_image_url = %s
            WHERE id = %s
            """,
            (
                new_room_id,
                new_room_price,
                new_room_number,
                new_room_type,
                new_room_image_url,
                booking_id
            )
        )

        new_room_status = (
            "Occupied"
            if status == "CheckedIn"
            else "Booked"
        )

        cursor.execute(
            """
            UPDATE rooms
            SET status = %s
            WHERE id = %s
            """,
            (
                new_room_status,
                new_room_id
            )
        )

        cursor.execute(
            """
            UPDATE rooms
            SET status = 'Empty'
            WHERE id = %s
            """,
            (old_room_id,)
        )

        conn.commit()

        return True, "Đổi phòng thành công."

    except Error as e:
        conn.rollback()
        return False, f"Lỗi khi đổi phòng: {e}"

    finally:
        cursor.close()
        conn.close()


# Hàm phụ trợ: lấy danh sách khách hàng / phòng cho combobox
def get_customers():
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    cursor.execute(
        """
        SELECT id, name
        FROM customers
        ORDER BY name
        """
    )

    result = cursor.fetchall()

    cursor.close()
    conn.close()

    return result


def get_available_rooms():
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    cursor.execute(
        """
        SELECT id, room_number, room_type
        FROM rooms
        WHERE status = 'Empty'
        ORDER BY room_number
        """
    )

    result = cursor.fetchall()

    cursor.close()
    conn.close()

    return result


def get_all_rooms():
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    cursor.execute(
        """
        SELECT id, room_number, room_type
        FROM rooms
        ORDER BY room_number
        """
    )

    result = cursor.fetchall()

    cursor.close()
    conn.close()

    return result


# ================== GIAO DIỆN ==================

class BookingWindow(tk.Frame):

    def __init__(self, master, *args, **kwargs):
        super().__init__(
            master,
            bg=COLOR_BG,
            *args,
            **kwargs
        )

        self.customers_map = {}
        self.rooms_map = {}
        self.all_bookings = []

        self._setup_style()
        self._build_header()
        self._build_form_card()
        self._build_search_bar()
        self._build_table()
        self._build_status_bar()

        self._add_placeholder(
            self.entry_checkin,
            "dd/mm/yyyy"
        )

        self._add_placeholder(
            self.entry_checkout,
            "dd/mm/yyyy"
        )

        self.load_bookings()

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

        # Các style nút theo màu chức năng
        button_specs = {
            "Add": ("#27ae60", "#1e8449"),
            "Edit": ("#2980b9", "#1f618d"),
            "Cancel": ("#c0392b", "#96281b"),
            "CheckIn": ("#8e44ad", "#6c3483"),
            "CheckOut": ("#d35400", "#a04000"),
            "ChangeRoom": ("#16a085", "#0e6655"),
            "Reset": ("#7f8c8d", "#616a6b"),
            "Search": ("#1f3a5f", "#152a45"),
            "Supply": ("#f39c12", "#d68910"),
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

        #QUAY VỀ
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
            text="QUẢN LÝ ĐẶT PHÒNG",
            font=FONT_TITLE,
            bg=COLOR_PRIMARY,
            fg="white"
        ).pack(
            side="left",
            padx=15
        )

    # ==============================
    # HÀM QUAY VỀ - PHẦN THÊM MỚI
    # ==============================
    def go_back(self):
        self.master.destroy()

    # ---------- Khung nhập liệu (card) ----------
    def _build_form_card(self):
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

        tk.Label(
            card,
            text="Thông tin đặt phòng",
            font=FONT_HEADING,
            bg=COLOR_CARD,
            fg=COLOR_TEXT
        ).grid(
            row=0,
            column=0,
            columnspan=4,
            sticky="w",
            padx=16,
            pady=(12, 6)
        )

        form = tk.Frame(
            card,
            bg=COLOR_CARD
        )

        form.grid(
            row=1,
            column=0,
            columnspan=4,
            sticky="ew",
            padx=16,
            pady=(0, 4)
        )

        for c in (1, 3):
            form.columnconfigure(
                c,
                weight=1
            )

        # Hàng 1: Khách hàng - Phòng
        self._field_label(
            form,
            "Khách hàng",
            0,
            0
        )

        self.cb_customer = ttk.Combobox(
            form,
            state="readonly",
            font=FONT_BODY
        )

        self.cb_customer.grid(
            row=0,
            column=1,
            sticky="ew",
            padx=(0, 20),
            pady=6
        )

        self._field_label(
            form,
            "Phòng",
            0,
            2
        )

        self.cb_room = ttk.Combobox(
            form,
            state="readonly",
            font=FONT_BODY
        )

        self.cb_room.grid(
            row=0,
            column=3,
            sticky="ew",
            pady=6
        )

        # Hàng 2: Ngày check-in - check-out
        self._field_label(
            form,
            "Check-in",
            1,
            0
        )

        self.entry_checkin = tk.Entry(
            form,
            font=FONT_BODY,
            relief="solid",
            borderwidth=1,
            highlightthickness=0
        )

        self.entry_checkin.grid(
            row=1,
            column=1,
            sticky="ew",
            padx=(0, 20),
            pady=6,
            ipady=3
        )

        self._field_label(
            form,
            "Check-out",
            1,
            2
        )

        self.entry_checkout = tk.Entry(
            form,
            font=FONT_BODY,
            relief="solid",
            borderwidth=1,
            highlightthickness=0
        )

        self.entry_checkout.grid(
            row=1,
            column=3,
            sticky="ew",
            pady=6,
            ipady=3
        )

        # Hàng 3: Phòng mới
        self._field_label(
            form,
            "Phòng mới (đổi phòng)",
            2,
            0
        )

        self.cb_new_room = ttk.Combobox(
            form,
            state="readonly",
            font=FONT_BODY
        )

        self.cb_new_room.grid(
            row=2,
            column=1,
            sticky="ew",
            padx=(0, 20),
            pady=(6, 12)
        )

        # Toolbar nút chức năng
        toolbar = tk.Frame(
            card,
            bg=COLOR_CARD
        )

        toolbar.grid(
            row=2,
            column=0,
            columnspan=4,
            sticky="w",
            padx=16,
            pady=(4, 14)
        )

        ttk.Button(
            toolbar,
            text="+ Thêm đặt phòng",
            style="Add.TButton",
            command=self.on_add
        ).pack(
            side="left",
            padx=(0, 8)
        )

        ttk.Button(
            toolbar,
            text="Sửa",
            style="Edit.TButton",
            command=self.on_edit
        ).pack(
            side="left",
            padx=8
        )

        ttk.Button(
            toolbar,
            text="Hủy đặt phòng",
            style="Cancel.TButton",
            command=self.on_cancel
        ).pack(
            side="left",
            padx=8
        )

        ttk.Button(
            toolbar,
            text="Check-in",
            style="CheckIn.TButton",
            command=self.on_checkin
        ).pack(
            side="left",
            padx=8
        )

        ttk.Button(
            toolbar,
            text="Check-out",
            style="CheckOut.TButton",
            command=self.on_checkout
        ).pack(
            side="left",
            padx=8
        )

        ttk.Button(
            toolbar,
            text="Đổi phòng",
            style="ChangeRoom.TButton",
            command=self.on_change_room
        ).pack(
            side="left",
            padx=8
        )
        ttk.Button(
            toolbar,
            text="Dịch vụ",
            style="Supply.TButton",
            command=self.on_supply
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

    def _field_label(self, parent, text, row, col):
        tk.Label(
            parent,
            text=text,
            font=FONT_BODY,
            bg=COLOR_CARD,
            fg=COLOR_MUTED,
            anchor="w"
        ).grid(
            row=row,
            column=col,
            sticky="w",
            pady=6
        )

    def _add_placeholder(self, entry, text):
        entry.insert(0, text)
        entry.config(fg=COLOR_MUTED)

        def on_focus_in(event):
            if entry.get() == text:
                entry.delete(0, tk.END)
                entry.config(fg=COLOR_TEXT)

        def on_focus_out(event):
            if not entry.get().strip():
                entry.insert(0, text)
                entry.config(fg=COLOR_MUTED)

        entry.bind(
            "<FocusIn>",
            on_focus_in
        )

        entry.bind(
            "<FocusOut>",
            on_focus_out
        )

    def _set_date_field(self, entry, text):
        entry.config(fg=COLOR_TEXT)
        entry.delete(0, tk.END)
        entry.insert(0, text)

    # ---------- Thanh tìm kiếm / lọc ----------
    def _build_search_bar(self):
        outer = tk.Frame(
            self,
            bg=COLOR_BG
        )

        outer.pack(
            fill="x",
            padx=16,
            pady=(0, 8)
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
            text="Tìm kiếm khách hàng:",
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
            "customer",
            "room",
            "checkin",
            "checkout",
            "actual_checkin",
            "actual_checkout",
            "extended_hours",
            "extra_fee",
            "status",
            "booking_date"
        )
        headers = {
            "id": "Mã ĐP",
            "customer": "Khách hàng",
            "room": "Phòng",
            "checkin": "Check-in dự kiến",
            "checkout": "Check-out dự kiến",
            "actual_checkin": "Check-in thực tế",
            "actual_checkout": "Check-out thực tế",
            "extended_hours": "Quá giờ",
            "extra_fee": "Phí quá giờ",
            "status": "Trạng thái",
            "booking_date": "Ngày đặt"
        }

        widths = {
            "id": 60,
            "customer": 150,
            "room": 130,
            "checkin": 120,
            "checkout": 120,
            "actual_checkin": 140,
            "actual_checkout": 140,
            "extended_hours": 80,
            "extra_fee": 110,
            "status": 120,
            "booking_date": 140
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
            anchor = "w" if col == "customer" else "center"

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

        # Dòng xen màu
        self.tree.tag_configure(
            "oddrow",
            background="#f7f9fb"
        )

        self.tree.tag_configure(
            "evenrow",
            background=COLOR_CARD
        )

        # Màu chữ theo trạng thái
        for status, color in STATUS_COLORS.items():
            self.tree.tag_configure(
                status,
                foreground=color,
                font=("Segoe UI", 10, "bold")
            )

        self.tree.bind(
            "<<TreeviewSelect>>",
            self.on_select_row
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
            text="0 đặt phòng",
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

    # ---------- Nạp dữ liệu combobox ----------
    def load_comboboxes(self):
        try:
            customers = get_customers()

            self.customers_map = {
                f"{c['id']}-{c['name']}": c["id"]
                for c in customers
            }

            self.cb_customer["values"] = list(
                self.customers_map.keys()
            )

            all_rooms = get_all_rooms()

            self.rooms_map = {
                f"{r['room_number']} - {ROOM_TYPE_VI.get(r['room_type'], r['room_type'])}": r["id"]
                for r in all_rooms
            }

            self.cb_room["values"] = list(
                self.rooms_map.keys()
            )

            self.cb_new_room["values"] = list(
                self.rooms_map.keys()
            )

        except Error as e:
            messagebox.showerror(
                "Lỗi",
                f"Không thể tải dữ liệu: {e}"
            )

    # ---------- Nạp danh sách đặt phòng ----------
    def load_bookings(self):
        try:
            self.all_bookings = get_bookings()

        except Error as e:
            messagebox.showerror(
                "Lỗi",
                f"Không thể tải danh sách đặt phòng: {e}"
            )

            self.all_bookings = []

        self.load_comboboxes()
        self.render_rows(self.all_bookings)
        self.set_status("Đã tải danh sách đặt phòng.")

    def render_rows(self, bookings):
        for row in self.tree.get_children():
            self.tree.delete(row)

        for i, b in enumerate(bookings):
            stripe = (
                "evenrow"
                if i % 2 == 0
                else "oddrow"
            )

            self.tree.insert(
                "",
                "end",
                iid=b["id"],
                tags=(stripe, b["status"]),
                values=(
                    b["id"],
                    b["customer_name"],
                    f"{b['room_number']} ({ROOM_TYPE_VI.get(b['room_type'], b['room_type'])})",
                    format_date_vi(b["checkin_date"]),
                    format_date_vi(b["checkout_date"]),
                    format_date_vi(b["actual_checkin"]),
                    format_date_vi(b["actual_checkout"]),
                    f"{b['extended_hours']} giờ",
                    f"{float(b['extra_fee']):,.0f} VNĐ",
                    STATUS_LABELS_VI.get(
                        b["status"],
                        b["status"]
                    ),
                    format_date_vi(b["booking_date"])
                )
            )

        self.lbl_count.config(
            text=f"{len(bookings)} đặt phòng"
        )

    # ---------- Tìm kiếm / lọc ----------
    def apply_filters(self):
        keyword = self.entry_search.get().strip().lower()
        status_label = self.cb_status_filter.get()

        filtered = self.all_bookings

        if keyword:
            filtered = [
                b
                for b in filtered
                if keyword in b["customer_name"].lower()
            ]

        if status_label and status_label != "Tất cả":
            filtered = [
                b
                for b in filtered
                if STATUS_LABELS_VI.get(
                    b["status"]
                ) == status_label
            ]

        self.render_rows(filtered)

        self.set_status(
            f"Tìm thấy {len(filtered)} kết quả."
        )

    # ---------- Chọn dòng trong bảng ----------
    def on_select_row(self, event):
        selected = self.tree.focus()

        if not selected:
            return

        booking_id = int(selected)

        booking = next(
            (
                b
                for b in self.all_bookings
                if b["id"] == booking_id
            ),
            None
        )

        if not booking:
            return

        customer_key = (
            f"{booking['customer_id']}-{booking['customer_name']}"
        )

        room_key = (
            f"{booking['room_number']} - "
            f"{ROOM_TYPE_VI.get(booking['room_type'], booking['room_type'])}"
        )

        if customer_key in self.customers_map:
            self.cb_customer.set(customer_key)

        if room_key in self.rooms_map:
            self.cb_room.set(room_key)

        self._set_date_field(
            self.entry_checkin,
            format_date_vi(booking["checkin_date"])
        )

        self._set_date_field(
            self.entry_checkout,
            format_date_vi(booking["checkout_date"])
        )

    def get_selected_id(self):
        selected = self.tree.focus()

        if not selected:
            messagebox.showwarning(
                "Thông báo",
                "Vui lòng chọn một đặt phòng trong danh sách."
            )

            return None

        return int(selected)

    def on_reset(self):
        self.entry_search.delete(
            0,
            tk.END
        )

        self.cb_status_filter.current(0)
        self.cb_customer.set("")
        self.cb_room.set("")
        self.cb_new_room.set("")

        self._set_date_field(
            self.entry_checkin,
            ""
        )

        self.entry_checkin.event_generate(
            "<FocusOut>"
        )

        self._set_date_field(
            self.entry_checkout,
            ""
        )

        self.entry_checkout.event_generate(
            "<FocusOut>"
        )

        self.load_bookings()

    # ---------- Thêm ----------
    def on_add(self):
        customer_key = self.cb_customer.get()
        room_key = self.cb_room.get()

        checkin_date = self.entry_checkin.get().strip()
        checkout_date = self.entry_checkout.get().strip()

        if checkin_date == "dd/mm/yyyy":
            checkin_date = ""

        if checkout_date == "dd/mm/yyyy":
            checkout_date = ""

        if (
            not customer_key
            or not room_key
            or not checkin_date
            or not checkout_date
        ):
            messagebox.showwarning(
                "Thông báo",
                "Vui lòng nhập đầy đủ thông tin."
            )
            return

        customer_id = self.customers_map[customer_key]
        room_id = self.rooms_map[room_key]

        ok, msg = add_booking(
            customer_id,
            room_id,
            checkin_date,
            checkout_date
        )

        self.set_status(msg)

        if ok:
            messagebox.showinfo(
                "Thành công",
                msg
            )

            self.load_bookings()

        else:
            messagebox.showerror(
                "Lỗi",
                msg
            )

    # Sửa
    def on_edit(self):
        booking_id = self.get_selected_id()

        if booking_id is None:
            return

        checkin_date = self.entry_checkin.get().strip()
        checkout_date = self.entry_checkout.get().strip()

        if checkin_date == "dd/mm/yyyy":
            checkin_date = ""

        if checkout_date == "dd/mm/yyyy":
            checkout_date = ""

        if not checkin_date or not checkout_date:
            messagebox.showwarning(
                "Thông báo",
                "Vui lòng nhập ngày check-in/check-out."
            )
            return

        ok, msg = edit_booking(
            booking_id,
            checkin_date,
            checkout_date
        )

        self.set_status(msg)

        if ok:
            messagebox.showinfo(
                "Thành công",
                msg
            )

            self.load_bookings()

        else:
            messagebox.showerror(
                "Lỗi",
                msg
            )

    # Hủy
    def on_cancel(self):
        booking_id = self.get_selected_id()

        if booking_id is None:
            return

        if not messagebox.askyesno(
            "Xác nhận",
            "Bạn có chắc muốn hủy đặt phòng này?"
        ):
            return

        ok, msg = cancel_booking(booking_id)

        self.set_status(msg)

        if ok:
            messagebox.showinfo(
                "Thành công",
                msg
            )

            self.load_bookings()

        else:
            messagebox.showerror(
                "Lỗi",
                msg
            )

    # Check-in
    def on_checkin(self):
        booking_id = self.get_selected_id()

        if booking_id is None:
            return

        ok, msg = checkin(booking_id)

        self.set_status(msg)

        if ok:
            messagebox.showinfo(
                "Thành công",
                msg
            )

            self.load_bookings()

        else:
            messagebox.showerror(
                "Lỗi",
                msg
            )

    # Check-out
    def on_checkout(self):
        booking_id = self.get_selected_id()

        if booking_id is None:
            return

        ok, msg = checkout(booking_id)

        self.set_status(msg)

        if ok:
            messagebox.showinfo(
                "Thành công",
                msg
            )

            self.load_bookings()

        else:
            messagebox.showerror(
                "Lỗi",
                msg
            )

    # Đổi phòng
    def on_change_room(self):
        booking_id = self.get_selected_id()

        if booking_id is None:
            return

        new_room_key = self.cb_new_room.get()

        if not new_room_key:
            messagebox.showwarning(
                "Thông báo",
                "Vui lòng chọn phòng mới."
            )
            return

        new_room_id = self.rooms_map[new_room_key]

        ok, msg = change_room(
            booking_id,
            new_room_id
        )

        self.set_status(msg)

        if ok:
            messagebox.showinfo(
                "Thành công",
                msg
            )

            self.load_bookings()

        else:
            messagebox.showerror(
                "Lỗi",
                msg
            )
# Mở cửa sổ quản lý vật tư của Booking đang được chọn
    def on_supply(self):
        booking_id = self.get_selected_id()

        if booking_id is None:
            return

        open_booking_supply_window(
            self,
            booking_id
    )


if __name__ == "__main__":
    root = tk.Tk()

    root.title(
        "Quản lý Đặt phòng - Khách sạn"
    )

    root.geometry(
        "1200x650"
    )

    root.configure(
        bg=COLOR_BG
    )

    window = BookingWindow(root)

    window.pack(
        fill="both",
        expand=True
    )

    root.mainloop()
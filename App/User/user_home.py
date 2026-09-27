import tkinter as tk
from tkinter import ttk, messagebox
import os
import sys


APP_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.append(os.path.abspath(os.path.join(APP_DIR, "..", "..")))

from db import get_connection
from mysql.connector import Error

try:
    from PIL import Image, ImageTk, ImageOps
    PIL_AVAILABLE = True
except ImportError:
    PIL_AVAILABLE = False

PHOTO_CACHE = []

# ================= MÀU SẮC =================
NAVY = "#1F3F64"
BACKGROUND = "#F3F5F7"
WHITE = "#FFFFFF"
BORDER = "#D6DDE5"
TEXT = "#243447"
GRAY = "#7F8C8D"
ORANGE = "#E67E22"
ORANGE_DARK = "#CA6510"

CARD_IMG_SIZE = (250, 150)

ROOM_TYPE_DISPLAY_TO_DB = {
    "Tất cả": None,
    "Tiêu chuẩn": "Standard",
    "Cao cấp": "Deluxe",
    "Hạng sang": "Suite",
}
ROOM_TYPE_DB_TO_DISPLAY = {
    "Standard": "Tiêu chuẩn",
    "Deluxe": "Cao cấp",
    "Suite": "Hạng sang",
}


# ================= TRUY VẤN DATABASE =================

def get_rooms(room_type_db=None, min_price=None, max_price=None):
   
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        query = (
            "SELECT id, room_number, room_type, status, price, "
            "image_url, description, max_guests "
            "FROM rooms WHERE status != 'Deactivated'"
        )
        params = []

        if room_type_db:
            query += " AND room_type = %s"
            params.append(room_type_db)

        if min_price is not None:
            query += " AND price >= %s"
            params.append(min_price)

        if max_price is not None:
            query += " AND price <= %s"
            params.append(max_price)

        query += " ORDER BY room_type, price"

        cursor.execute(query, params)
        return cursor.fetchall()
    finally:
        cursor.close()
        conn.close()


def send_consultation_request(room_id, full_name, phone, email, note):
    try:
        conn = get_connection()
        cursor = conn.cursor()
        try:
            cursor.execute(
                """
                INSERT INTO consultation_requests
                    (room_id, full_name, phone, email, note, status)
                VALUES (%s, %s, %s, %s, %s, 'New')
                """,
                (room_id, full_name, phone, email or None, note or None),
            )
            conn.commit()
        finally:
            cursor.close()
            conn.close()
        return True, "Đã gửi yêu cầu tư vấn. Nhân viên khách sạn sẽ liên hệ với bạn sớm nhất."
    except Error as e:
        return False, f"Không thể gửi yêu cầu, vui lòng thử lại: {e}"


# ================= TIỆN ÍCH =================

def format_price(price):
    return f"{float(price):,.0f} VNĐ/đêm"


def load_room_photo(image_url):
    if not PIL_AVAILABLE or not image_url:
        return None
    try:
        path = image_url if os.path.isabs(image_url) else os.path.join(APP_DIR, image_url)
        img = Image.open(path)
        img = ImageOps.fit(img.convert("RGB"), CARD_IMG_SIZE, Image.LANCZOS)
        photo = ImageTk.PhotoImage(img)
        PHOTO_CACHE.append(photo)
        return photo
    except Exception:
        return None


# ================= POPUP FORM LIÊN HỆ =================

def open_contact_popup(root, room):
    popup = tk.Toplevel(root)
    popup.title(f"Liên hệ tư vấn - Phòng {room['room_number']}")
    popup.geometry("400x480")
    popup.configure(bg=WHITE)
    popup.resizable(False, False)
    popup.grab_set()
    popup.transient(root)

    tk.Label(
        popup,
        text=f"Phòng {room['room_number']} · {ROOM_TYPE_DB_TO_DISPLAY.get(room['room_type'], room['room_type'])}",
        bg=WHITE, fg=TEXT, font=("Segoe UI", 14, "bold"),
    ).pack(pady=(20, 4))

    tk.Label(
        popup, text=format_price(room["price"]),
        bg=WHITE, fg=NAVY, font=("Segoe UI", 11, "bold"),
    ).pack(pady=(0, 4))

    tk.Label(
        popup, text="Vui lòng để lại thông tin, nhân viên sẽ liên hệ tư vấn cho bạn.",
        bg=WHITE, fg=GRAY, font=("Segoe UI", 9), wraplength=340, justify="center",
    ).pack(pady=(0, 16))

    form = tk.Frame(popup, bg=WHITE)
    form.pack(fill="x", padx=25)

    def add_field(label_text, required=False):
        label_line = tk.Frame(form, bg=WHITE)
        label_line.pack(fill="x", anchor="w")
        tk.Label(label_line, text=label_text, bg=WHITE, fg=GRAY, font=("Segoe UI", 10)).pack(side="left")
        if required:
            tk.Label(label_line, text=" *", bg=WHITE, fg="#D63C32", font=("Segoe UI", 10, "bold")).pack(side="left")
        entry = tk.Entry(form, relief="solid", bd=1, font=("Segoe UI", 10))
        entry.pack(fill="x", ipady=5, pady=(2, 12))
        return entry

    name_entry = add_field("Họ tên", required=True)
    phone_entry = add_field("Số điện thoại", required=True)
    email_entry = add_field("Email")

    tk.Label(form, text="Ghi chú", bg=WHITE, fg=GRAY, font=("Segoe UI", 10)).pack(anchor="w")
    note_text = tk.Text(form, height=3, relief="solid", bd=1, font=("Segoe UI", 10))
    note_text.pack(fill="x", pady=(2, 14))

    def submit():
        full_name = name_entry.get().strip()
        phone = phone_entry.get().strip()
        email = email_entry.get().strip()
        note = note_text.get("1.0", "end").strip()

        if not full_name:
            messagebox.showwarning("Thiếu thông tin", "Vui lòng nhập họ tên.")
            name_entry.focus_set()
            return

        if not phone:
            messagebox.showwarning("Thiếu thông tin", "Vui lòng nhập số điện thoại.")
            phone_entry.focus_set()
            return

        ok, msg = send_consultation_request(room["id"], full_name, phone, email, note)

        if ok:
            messagebox.showinfo("Đã gửi", msg)
            popup.destroy()
        else:
            messagebox.showerror("Lỗi", msg)

    tk.Button(
        form, text="Gửi yêu cầu tư vấn", command=submit,
        bg=ORANGE, fg=WHITE, activebackground=ORANGE_DARK, activeforeground=WHITE,
        relief="flat", bd=0, font=("Segoe UI", 10, "bold"), pady=9, cursor="hand2",
    ).pack(fill="x")


# ================= ỨNG DỤNG CHÍNH =================

class HotelHomeApp:
    def __init__(self, root):
        self.root = root
        self.root.title("Khách sạn")
        self.root.geometry("1000x700")
        self.root.minsize(900, 600)
        self.root.configure(bg=BACKGROUND)

        style = ttk.Style(self.root)
        style.theme_use("clam")
        style.configure("TCombobox", fieldbackground=WHITE, background=WHITE, foreground=TEXT)

        self._build_banner()
        self._build_search_bar()
        self._build_room_list_area()

        self.search_rooms()

    # ---------- Banner "Khách sạn" ----------
    def _build_banner(self):
        banner = tk.Frame(self.root, bg=WHITE, height=110)
        banner.pack(fill="x")
        banner.pack_propagate(False)

        tk.Label(
            banner, text="Khách sạn abc", bg=WHITE, fg=TEXT, font=("Segoe UI", 22),
        ).pack(expand=True)

        tk.Frame(self.root, bg=BORDER, height=1).pack(fill="x")

    # ---------- Thanh tìm kiếm ----------
    def _build_search_bar(self):
        outer = tk.Frame(self.root, bg=BACKGROUND)
        outer.pack(fill="x", padx=20, pady=18)

        bar = tk.Frame(outer, bg=WHITE, highlightbackground=BORDER, highlightthickness=1)
        bar.pack(fill="x")

        inner = tk.Frame(bar, bg=WHITE)
        inner.pack(padx=20, pady=16)

        self.type_var = tk.StringVar(value="Tất cả")
        self.min_price_var = tk.StringVar()
        self.max_price_var = tk.StringVar()

        # Loại phòng
        tk.Label(inner, text="Loại phòng", bg=WHITE, fg=GRAY, font=("Segoe UI", 9)).grid(
            row=0, column=0, sticky="w"
        )
        ttk.Combobox(
            inner, textvariable=self.type_var,
            values=list(ROOM_TYPE_DISPLAY_TO_DB.keys()),
            state="readonly", width=14,
        ).grid(row=1, column=0, padx=(0, 16), pady=(2, 0))

        # Giá từ
        tk.Label(inner, text="Giá từ (VNĐ)", bg=WHITE, fg=GRAY, font=("Segoe UI", 9)).grid(
            row=0, column=1, sticky="w"
        )
        tk.Entry(
            inner, textvariable=self.min_price_var, width=14, relief="solid", bd=1,
        ).grid(row=1, column=1, padx=(0, 16), pady=(2, 0), ipady=3)

        # Giá đến
        tk.Label(inner, text="Giá đến (VNĐ)", bg=WHITE, fg=GRAY, font=("Segoe UI", 9)).grid(
            row=0, column=2, sticky="w"
        )
        tk.Entry(
            inner, textvariable=self.max_price_var, width=14, relief="solid", bd=1,
        ).grid(row=1, column=2, padx=(0, 16), pady=(2, 0), ipady=3)

        # Nút Tìm kiếm (chữ cam, giống wireframe)
        search_btn = tk.Button(
            inner, text="Tìm kiếm", command=self.search_rooms,
            bg=WHITE, fg=ORANGE, activebackground="#FDF1E6", activeforeground=ORANGE_DARK,
            relief="solid", bd=1, font=("Segoe UI", 10, "bold"), padx=16, pady=5, cursor="hand2",
        )
        search_btn.grid(row=1, column=3, sticky="s")

    # ---------- Khu vực danh sách phòng ----------
    def _build_room_list_area(self):
        container = tk.Frame(self.root, bg=BACKGROUND)
        container.pack(fill="both", expand=True, padx=20, pady=(0, 20))

        header_row = tk.Frame(container, bg=BACKGROUND)
        header_row.pack(fill="x")

        tk.Label(
            header_row, text="Danh sách phòng", bg=BACKGROUND, fg=NAVY,
            font=("Segoe UI", 11, "bold"),
        ).pack(side="left")

        self.result_count_label = tk.Label(
            header_row, text="", bg=BACKGROUND, fg=GRAY, font=("Segoe UI", 9),
        )
        self.result_count_label.pack(side="right")

        tk.Frame(container, bg=BORDER, height=1).pack(fill="x", pady=(6, 10))

        # Canvas cuộn được
        canvas_area = tk.Frame(container, bg=BACKGROUND)
        canvas_area.pack(fill="both", expand=True)

        self.canvas = tk.Canvas(canvas_area, bg=BACKGROUND, highlightthickness=0)
        scrollbar = ttk.Scrollbar(canvas_area, orient="vertical", command=self.canvas.yview)
        self.canvas.configure(yscrollcommand=scrollbar.set)

        self.canvas.pack(side="left", fill="both", expand=True)
        scrollbar.pack(side="right", fill="y")

        self.cards_frame = tk.Frame(self.canvas, bg=BACKGROUND)
        self.canvas_window = self.canvas.create_window((0, 0), window=self.cards_frame, anchor="nw")

        self.cards_frame.bind(
            "<Configure>",
            lambda e: self.canvas.configure(scrollregion=self.canvas.bbox("all")),
        )
        self.canvas.bind(
            "<Configure>",
            lambda e: self.canvas.itemconfig(self.canvas_window, width=e.width),
        )
        self.canvas.bind_all("<MouseWheel>", self._on_mousewheel)

    def _on_mousewheel(self, event):
        self.canvas.yview_scroll(int(-1 * (event.delta / 120)), "units")

    # ---------- Tìm kiếm ----------
    def search_rooms(self):
        room_type_db = ROOM_TYPE_DISPLAY_TO_DB.get(self.type_var.get())
        min_price_raw = self.min_price_var.get().strip()
        max_price_raw = self.max_price_var.get().strip()

        try:
            min_price = float(min_price_raw) if min_price_raw else None
            max_price = float(max_price_raw) if max_price_raw else None
        except ValueError:
            messagebox.showwarning("Thông báo", "Khoảng giá phải là số.")
            return

        if min_price is not None and max_price is not None and min_price > max_price:
            messagebox.showwarning("Thông báo", "Giá từ không được lớn hơn giá đến.")
            return

        try:
            rooms = get_rooms(room_type_db, min_price, max_price)
        except Error as e:
            messagebox.showerror("Lỗi", f"Không thể tải danh sách phòng: {e}")
            return

        self.result_count_label.config(text=f"Tìm thấy {len(rooms)} phòng")
        self.render_rooms(rooms)

    # ---------- Vẽ danh sách thẻ phòng ----------
    def render_rooms(self, rooms):
        for widget in self.cards_frame.winfo_children():
            widget.destroy()

        if not rooms:
            tk.Label(
                self.cards_frame, text="Không tìm thấy phòng phù hợp với bộ lọc.",
                bg=BACKGROUND, fg=GRAY, font=("Segoe UI", 11),
            ).grid(row=0, column=0, padx=10, pady=30)
            return

        columns = 3
        for col in range(columns):
            self.cards_frame.columnconfigure(col, weight=1)

        for index, room in enumerate(rooms):
            row, col = divmod(index, columns)
            card = self.build_room_card(room)
            card.grid(row=row, column=col, padx=10, pady=10, sticky="n")

    def build_room_card(self, room):
        card = tk.Frame(
            self.cards_frame, bg=WHITE, highlightbackground=BORDER, highlightthickness=1,
            width=270, height=340,
        )
        card.pack_propagate(False)

        # Ảnh
        image_area = tk.Frame(card, bg="#EAEFF4", width=CARD_IMG_SIZE[0], height=CARD_IMG_SIZE[1])
        image_area.pack(fill="x")
        image_area.pack_propagate(False)

        photo = load_room_photo(room.get("image_url"))
        if photo is not None:
            tk.Label(image_area, image=photo, bg="#EAEFF4").place(x=0, y=0, relwidth=1, relheight=1)
        else:
            tk.Label(image_area, text="🏨", bg="#EAEFF4", fg="#B8C2CC", font=("Segoe UI", 26)).pack(
                expand=True, pady=(22, 0)
            )
            tk.Label(image_area, text="Chưa có ảnh", bg="#EAEFF4", fg="#B8C2CC", font=("Segoe UI", 9)).pack()

        # Thông tin
        info = tk.Frame(card, bg=WHITE)
        info.pack(fill="both", expand=True, padx=14, pady=(10, 12))

        type_display = ROOM_TYPE_DB_TO_DISPLAY.get(room["room_type"], room["room_type"])
        tk.Label(
            info, text=f"Phòng {room['room_number']} · {type_display}",
            bg=WHITE, fg=TEXT, font=("Segoe UI", 11, "bold"),
        ).pack(anchor="w")

        tk.Label(
            info, text=format_price(room["price"]),
            bg=WHITE, fg=NAVY, font=("Segoe UI", 11, "bold"),
        ).pack(anchor="w", pady=(2, 4))

        description = room.get("description") or "Chưa có mô tả."
        tk.Label(
            info, text=description, bg=WHITE, fg=GRAY, font=("Segoe UI", 9),
            wraplength=230, justify="left", anchor="w",
        ).pack(anchor="w", fill="x")

        tk.Label(
            info, text=f"Tối đa {room['max_guests']} khách",
            bg=WHITE, fg=GRAY, font=("Segoe UI", 9),
        ).pack(anchor="w", pady=(4, 0))

        tk.Button(
            info, text="Xem & liên hệ tư vấn",
            command=lambda r=room: open_contact_popup(self.root, r),
            bg=NAVY, fg=WHITE, activebackground="#173451", activeforeground=WHITE,
            relief="flat", bd=0, font=("Segoe UI", 9, "bold"), pady=7, cursor="hand2",
        ).pack(fill="x", side="bottom", pady=(8, 0))

        return card


if __name__ == "__main__":
    root = tk.Tk()
    app = HotelHomeApp(root)
    root.mainloop()
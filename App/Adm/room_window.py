import tkinter as tk
from tkinter import ttk, messagebox
import os
import sys

APP_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.append(os.path.abspath(os.path.join(APP_DIR, "..", "..")))
from db import get_connection

from mysql.connector import Error

TYPES = ("Standard", "Deluxe", "Suite")
STATUSES = ("Empty", "Booked", "Occupied", "Deactivated")

ROOM_TYPE_VI = {
    "Standard": "Tiêu chuẩn",
    "Deluxe": "Cao cấp",
    "Suite": "Hạng sang",
}
ROOM_TYPE_EN = {v: k for k, v in ROOM_TYPE_VI.items()}

STATUS_VI = {
    "Empty": "Trống",
    "Booked": "Đã đặt",
    "Occupied": "Đang có khách",
    "Deactivated": "Ngừng phục vụ",
}
STATUS_EN = {v: k for k, v in STATUS_VI.items()}

# Trống = 1 màu, có khách (Booked/Occupied) = chung 1 màu, ngừng phục vụ = xám
STATUS_COLOR = {
    "Empty": "#20B26B",
    "Booked": "#D63C32",
    "Occupied": "#D63C32",
    "Deactivated": "#7F8C8D",
}

DESCRIPTION_MAX_LEN = 150


# ================= DATABASE =================

def connect():
    return get_connection()


def init_db():
    db = connect()
    cursor = db.cursor()
    try:
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS rooms (
                id INT AUTO_INCREMENT PRIMARY KEY,
                room_number VARCHAR(10) NOT NULL UNIQUE,
                room_type ENUM('Standard','Deluxe','Suite') NOT NULL,
                status ENUM('Empty','Booked','Occupied','Deactivated') DEFAULT 'Empty',
                price DECIMAL(10,2) NOT NULL,
                image_url VARCHAR(255),
                description VARCHAR(150),
                max_guests INT NOT NULL DEFAULT 2
            )
        """)
        db.commit()
    finally:
        cursor.close()
        db.close()


def get_rooms():
    db = connect()
    cursor = db.cursor()
    try:
        cursor.execute(
            "SELECT id, room_number, room_type, status, price, image_url, "
            "description, max_guests FROM rooms ORDER BY id"
        )
        return cursor.fetchall()
    finally:
        cursor.close()
        db.close()


def add_room(room_number, room_type, price, image_url="", description="", max_guests=2):
    try:
        db = connect()
        cursor = db.cursor()
        try:
            cursor.execute("""
                INSERT INTO rooms
                (room_number, room_type, status, price, image_url, description, max_guests)
                VALUES (%s, %s, 'Empty', %s, %s, %s, %s)
            """, (room_number, room_type, price, image_url, description, max_guests))

            db.commit()

        finally:
            cursor.close()
            db.close()

        return True

    except Error:
        return False


def update_room(room_id, room_number, room_type, status, price, image_url="", description="", max_guests=2):
    try:
        db = connect()
        cursor = db.cursor()

        try:
            cursor.execute("""
                UPDATE rooms
                SET room_number=%s,
                    room_type=%s,
                    status=%s,
                    price=%s,
                    image_url=%s,
                    description=%s,
                    max_guests=%s
                WHERE id=%s
            """, (
                room_number,
                room_type,
                status,
                price,
                image_url,
                description,
                max_guests,
                room_id
            ))

            db.commit()

            return cursor.rowcount > 0

        finally:
            cursor.close()
            db.close()

    except Error:
        return False


def delete_room(room_id):
    db = connect()
    cursor = db.cursor()

    try:
        cursor.execute(
            "DELETE FROM rooms WHERE id=%s",
            (room_id,)
        )

        db.commit()

        return cursor.rowcount > 0

    finally:
        cursor.close()
        db.close()


def deactivate_room(room_id):
    db = connect()
    cursor = db.cursor()

    try:
        cursor.execute("""
            UPDATE rooms
            SET status='Deactivated'
            WHERE id=%s
        """, (room_id,))

        db.commit()

        return cursor.rowcount > 0

    finally:
        cursor.close()
        db.close()


# ================= GUI =================

def refresh():
    for item in table.get_children():
        table.delete(item)

    for room in get_rooms():
        room_id, room_number, room_type, status, price, image_url, description, max_guests = room

        display_row = (
            room_id,
            room_number,
            ROOM_TYPE_VI.get(room_type, room_type),
            STATUS_VI.get(status, status),
            price,
            max_guests,
            description or "",
            image_url or ""
        )

        table.insert("", "end", values=display_row, tags=(status,))


def clear_form():
    id_var.set("")
    number_var.set("")
    type_var.set(ROOM_TYPE_VI["Standard"])
    status_var.set(STATUS_VI["Empty"])
    price_var.set("")
    image_var.set("")
    description_var.set("")
    guests_var.set("2")


def add():
    number = number_var.get().strip()
    room_type = ROOM_TYPE_EN.get(type_var.get(), "Standard")
    price = price_var.get().strip()
    image = image_var.get().strip()
    description = description_var.get().strip()
    guests = guests_var.get().strip()

    if not number or not price:
        messagebox.showwarning(
            "Thông báo",
            "Vui lòng nhập số phòng và giá."
        )
        return

    try:
        price = float(price)

        if price < 0:
            raise ValueError

    except ValueError:
        messagebox.showwarning(
            "Thông báo",
            "Giá phòng không hợp lệ."
        )
        return

    if len(description) > DESCRIPTION_MAX_LEN:
        messagebox.showwarning(
            "Thông báo",
            f"Mô tả ngắn chỉ được tối đa {DESCRIPTION_MAX_LEN} ký tự."
        )
        return

    try:
        guests = int(guests) if guests else 2

        if guests <= 0:
            raise ValueError

    except ValueError:
        messagebox.showwarning(
            "Thông báo",
            "Số người tối đa phải là số nguyên dương."
        )
        return

    if add_room(number, room_type, price, image, description, guests):
        messagebox.showinfo(
            "Thành công",
            "Đã thêm phòng."
        )

        clear_form()
        refresh()

    else:
        messagebox.showerror(
            "Lỗi",
            "Số phòng đã tồn tại."
        )


def update():
    room_id = id_var.get()

    if not room_id:
        messagebox.showwarning(
            "Thông báo",
            "Hãy chọn phòng cần cập nhật."
        )
        return

    number = number_var.get().strip()
    room_type = ROOM_TYPE_EN.get(type_var.get(), "Standard")
    status = STATUS_EN.get(status_var.get(), "Empty")
    price = price_var.get().strip()
    image = image_var.get().strip()
    description = description_var.get().strip()
    guests = guests_var.get().strip()

    if not number or not price:
        messagebox.showwarning(
            "Thông báo",
            "Vui lòng nhập đầy đủ thông tin."
        )
        return

    try:
        price = float(price)

        if price < 0:
            raise ValueError

    except ValueError:
        messagebox.showwarning(
            "Thông báo",
            "Giá phòng không hợp lệ."
        )
        return

    if len(description) > DESCRIPTION_MAX_LEN:
        messagebox.showwarning(
            "Thông báo",
            f"Mô tả ngắn chỉ được tối đa {DESCRIPTION_MAX_LEN} ký tự."
        )
        return

    try:
        guests = int(guests) if guests else 2

        if guests <= 0:
            raise ValueError

    except ValueError:
        messagebox.showwarning(
            "Thông báo",
            "Số người tối đa phải là số nguyên dương."
        )
        return

    if update_room(
        room_id,
        number,
        room_type,
        status,
        price,
        image,
        description,
        guests
    ):
        messagebox.showinfo(
            "Thành công",
            "Đã cập nhật phòng."
        )

        clear_form()
        refresh()

    else:
        messagebox.showerror(
            "Lỗi",
            "Không thể cập nhật. Có thể số phòng đã tồn tại."
        )


def delete():
    room_id = id_var.get()

    if not room_id:
        messagebox.showwarning(
            "Thông báo",
            "Hãy chọn phòng cần xóa."
        )
        return

    if not messagebox.askyesno(
        "Xác nhận",
        "Bạn có chắc muốn xóa phòng này?"
    ):
        return

    if delete_room(room_id):
        messagebox.showinfo(
            "Thành công",
            "Đã xóa phòng."
        )

        clear_form()
        refresh()


def deactivate():
    room_id = id_var.get()

    if not room_id:
        messagebox.showwarning(
            "Thông báo",
            "Hãy chọn phòng cần vô hiệu hóa."
        )
        return

    if not messagebox.askyesno(
        "Xác nhận",
        "Bạn có chắc muốn vô hiệu hóa phòng này?"
    ):
        return

    if deactivate_room(room_id):
        messagebox.showinfo(
            "Thành công",
            "Phòng đã được chuyển sang trạng thái Deactivated."
        )

        clear_form()
        refresh()


def select_room(event):
    selected = table.selection()

    if not selected:
        return

    values = table.item(
        selected[0],
        "values"
    )

    id_var.set(values[0])
    number_var.set(values[1])
    type_var.set(values[2])
    status_var.set(values[3])
    price_var.set(values[4])
    guests_var.set(values[5])
    description_var.set(values[6])
    image_var.set(values[7])


# ================= WINDOW =================

init_db()

root = tk.Tk()

root.title("Quản lý phòng khách sạn")
root.geometry("1000x600")
root.minsize(900, 550)


# ================= COLORS =================

NAVY = "#1F3F64"
NAVY_DARK = "#173451"
BACKGROUND = "#F3F5F7"
WHITE = "#FFFFFF"
LIGHT_BLUE = "#E8EEF5"
BORDER = "#D6DDE5"
TEXT = "#243447"
GRAY = "#7F8C8D"
GREEN = "#20B26B"
GREEN_DARK = "#17965A"
BLUE = "#2684C2"
BLUE_DARK = "#1C6C9F"
RED = "#D63C32"
RED_DARK = "#B52F27"
ORANGE = "#E67E22"
ORANGE_DARK = "#C96316"


root.configure(bg=BACKGROUND)


# ---------- ttk Style ----------

style = ttk.Style()
style.theme_use("clam")

style.configure(
    "Treeview",
    background=WHITE,
    fieldbackground=WHITE,
    foreground=TEXT,
    rowheight=32,
    borderwidth=0,
    font=("Arial", 10)
)

style.configure(
    "Treeview.Heading",
    background=LIGHT_BLUE,
    foreground=TEXT,
    font=("Arial", 10, "bold"),
    padding=8,
    relief="flat"
)

style.map(
    "Treeview",
    background=[
        ("selected", "#DCEAF7")
    ],
    foreground=[
        ("selected", TEXT)
    ]
)

style.configure(
    "TCombobox",
    fieldbackground=WHITE,
    background=WHITE,
    foreground=TEXT,
    bordercolor=BORDER,
    lightcolor=BORDER,
    darkcolor=BORDER
)


# ---------- Title ----------

header = tk.Frame(
    root,
    bg=NAVY,
    height=70
)

header.pack(fill="x")
header.pack_propagate(False)

tk.Label(
    header,
    text="QUẢN LÝ PHÒNG KHÁCH SẠN",
    bg=NAVY,
    fg=WHITE,
    font=("Arial", 20, "bold")
).pack(
    side="left",
    padx=25
)


# ---------- Form ----------

form_container = tk.Frame(
    root,
    bg=WHITE,
    highlightbackground=BORDER,
    highlightthickness=1
)

form_container.pack(
    padx=15,
    pady=(15, 10),
    fill="x"
)

tk.Label(
    form_container,
    text="Thông tin phòng",
    bg=WHITE,
    fg=TEXT,
    font=("Arial", 12, "bold")
).grid(
    row=0,
    column=0,
    columnspan=4,
    sticky="w",
    padx=25,
    pady=(18, 10)
)

form = tk.Frame(
    form_container,
    bg=WHITE
)

form.grid(
    row=1,
    column=0,
    columnspan=4,
    sticky="ew",
    padx=25
)


id_var = tk.StringVar()
number_var = tk.StringVar()
type_var = tk.StringVar(value=ROOM_TYPE_VI["Standard"])
status_var = tk.StringVar(value=STATUS_VI["Empty"])
price_var = tk.StringVar()
image_var = tk.StringVar()
description_var = tk.StringVar()
guests_var = tk.StringVar(value="2")


tk.Label(
    form,
    text="ID",
    bg=WHITE,
    fg=GRAY,
    font=("Arial", 10)
).grid(
    row=0,
    column=0,
    padx=(0, 8),
    pady=6,
    sticky="w"
)

tk.Entry(
    form,
    textvariable=id_var,
    state="readonly",
    width=15,
    bg="#F5F6F7",
    readonlybackground="#F5F6F7",
    fg=TEXT,
    relief="solid",
    bd=1
).grid(
    row=0,
    column=1,
    padx=(0, 25),
    pady=6,
    sticky="w"
)


tk.Label(
    form,
    text="Số phòng",
    bg=WHITE,
    fg=GRAY,
    font=("Arial", 10)
).grid(
    row=0,
    column=2,
    padx=(0, 8),
    pady=6,
    sticky="w"
)

tk.Entry(
    form,
    textvariable=number_var,
    width=20,
    bg=WHITE,
    fg=TEXT,
    relief="solid",
    bd=1
).grid(
    row=0,
    column=3,
    padx=(0, 25),
    pady=6,
    sticky="w"
)


tk.Label(
    form,
    text="Loại phòng",
    bg=WHITE,
    fg=GRAY,
    font=("Arial", 10)
).grid(
    row=1,
    column=0,
    padx=(0, 8),
    pady=6,
    sticky="w"
)

ttk.Combobox(
    form,
    textvariable=type_var,
    values=list(ROOM_TYPE_VI.values()),
    state="readonly",
    width=18
).grid(
    row=1,
    column=1,
    padx=(0, 25),
    pady=6,
    sticky="w"
)


tk.Label(
    form,
    text="Trạng thái",
    bg=WHITE,
    fg=GRAY,
    font=("Arial", 10)
).grid(
    row=1,
    column=2,
    padx=(0, 8),
    pady=6,
    sticky="w"
)

ttk.Combobox(
    form,
    textvariable=status_var,
    values=list(STATUS_VI.values()),
    state="readonly",
    width=18
).grid(
    row=1,
    column=3,
    padx=(0, 25),
    pady=6,
    sticky="w"
)


tk.Label(
    form,
    text="Giá/ngày",
    bg=WHITE,
    fg=GRAY,
    font=("Arial", 10)
).grid(
    row=2,
    column=0,
    padx=(0, 8),
    pady=6,
    sticky="w"
)

tk.Entry(
    form,
    textvariable=price_var,
    width=20,
    bg=WHITE,
    fg=TEXT,
    relief="solid",
    bd=1
).grid(
    row=2,
    column=1,
    padx=(0, 25),
    pady=6,
    sticky="w"
)


tk.Label(
    form,
    text="Image URL",
    bg=WHITE,
    fg=GRAY,
    font=("Arial", 10)
).grid(
    row=2,
    column=2,
    padx=(0, 8),
    pady=6,
    sticky="w"
)

tk.Entry(
    form,
    textvariable=image_var,
    width=40,
    bg=WHITE,
    fg=TEXT,
    relief="solid",
    bd=1
).grid(
    row=2,
    column=3,
    padx=(0, 25),
    pady=6,
    sticky="w"
)


tk.Label(
    form,
    text="Số người tối đa",
    bg=WHITE,
    fg=GRAY,
    font=("Arial", 10)
).grid(
    row=3,
    column=0,
    padx=(0, 8),
    pady=6,
    sticky="w"
)

tk.Entry(
    form,
    textvariable=guests_var,
    width=20,
    bg=WHITE,
    fg=TEXT,
    relief="solid",
    bd=1
).grid(
    row=3,
    column=1,
    padx=(0, 25),
    pady=6,
    sticky="w"
)


tk.Label(
    form,
    text="Mô tả ngắn",
    bg=WHITE,
    fg=GRAY,
    font=("Arial", 10)
).grid(
    row=3,
    column=2,
    padx=(0, 8),
    pady=6,
    sticky="w"
)

tk.Entry(
    form,
    textvariable=description_var,
    width=40,
    bg=WHITE,
    fg=TEXT,
    relief="solid",
    bd=1
).grid(
    row=3,
    column=3,
    padx=(0, 25),
    pady=6,
    sticky="w"
)


# ---------- Buttons ----------

buttons = tk.Frame(
    form_container,
    bg=WHITE
)

buttons.grid(
    row=2,
    column=0,
    columnspan=4,
    sticky="w",
    padx=25,
    pady=(10, 20)
)


tk.Button(
    buttons,
    text="Thêm phòng",
    width=15,
    command=add,
    bg=GREEN,
    fg=WHITE,
    activebackground=GREEN_DARK,
    activeforeground=WHITE,
    relief="flat",
    bd=0,
    font=("Arial", 10, "bold"),
    padx=5,
    pady=8,
    cursor="hand2"
).pack(
    side="left",
    padx=(0, 10)
)


tk.Button(
    buttons,
    text="Cập nhật",
    width=15,
    command=update,
    bg=BLUE,
    fg=WHITE,
    activebackground=BLUE_DARK,
    activeforeground=WHITE,
    relief="flat",
    bd=0,
    font=("Arial", 10, "bold"),
    padx=5,
    pady=8,
    cursor="hand2"
).pack(
    side="left",
    padx=10
)


tk.Button(
    buttons,
    text="Xóa phòng",
    width=15,
    command=delete,
    bg=RED,
    fg=WHITE,
    activebackground=RED_DARK,
    activeforeground=WHITE,
    relief="flat",
    bd=0,
    font=("Arial", 10, "bold"),
    padx=5,
    pady=8,
    cursor="hand2"
).pack(
    side="left",
    padx=10
)


tk.Button(
    buttons,
    text="Vô hiệu hóa",
    width=15,
    command=deactivate,
    bg=ORANGE,
    fg=WHITE,
    activebackground=ORANGE_DARK,
    activeforeground=WHITE,
    relief="flat",
    bd=0,
    font=("Arial", 10, "bold"),
    padx=5,
    pady=8,
    cursor="hand2"
).pack(
    side="left",
    padx=10
)


tk.Button(
    buttons,
    text="Làm mới",
    width=15,
    command=lambda: [clear_form(), refresh()],
    bg=GRAY,
    fg=WHITE,
    activebackground="#687778",
    activeforeground=WHITE,
    relief="flat",
    bd=0,
    font=("Arial", 10, "bold"),
    padx=5,
    pady=8,
    cursor="hand2"
).pack(
    side="left",
    padx=10
)


# ---------- Table ----------

table_container = tk.Frame(
    root,
    bg=WHITE,
    highlightbackground=BORDER,
    highlightthickness=1
)

table_container.pack(
    padx=15,
    pady=(0, 15),
    fill="both",
    expand=True
)

table_frame = tk.Frame(
    table_container,
    bg=WHITE
)

table_frame.pack(
    padx=15,
    pady=15,
    fill="both",
    expand=True
)


columns = (
    "id",
    "room_number",
    "room_type",
    "status",
    "price",
    "max_guests",
    "description",
    "image_url"
)


table = ttk.Treeview(
    table_frame,
    columns=columns,
    show="headings"
)


headers = {
    "id": "ID",
    "room_number": "Số phòng",
    "room_type": "Loại phòng",
    "status": "Trạng thái",
    "price": "Giá/ngày",
    "max_guests": "Số người",
    "description": "Mô tả ngắn",
    "image_url": "Image URL"
}


widths = {
    "id": 50,
    "room_number": 100,
    "room_type": 110,
    "status": 130,
    "price": 110,
    "max_guests": 80,
    "description": 220,
    "image_url": 220
}


for column in columns:

    anchor = "w" if column == "description" else "center"

    table.heading(
        column,
        text=headers[column]
    )

    table.column(
        column,
        width=widths[column],
        anchor=anchor
    )


for status_key, color in STATUS_COLOR.items():
    table.tag_configure(
        status_key,
        foreground=color,
        font=("Arial", 10, "bold")
    )


scrollbar = ttk.Scrollbar(
    table_frame,
    orient="vertical",
    command=table.yview
)

table.configure(
    yscrollcommand=scrollbar.set
)


table.pack(
    side="left",
    fill="both",
    expand=True
)

scrollbar.pack(
    side="right",
    fill="y"
)


table.bind(
    "<<TreeviewSelect>>",
    select_room
)


refresh()

root.mainloop()
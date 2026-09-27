import tkinter as tk
from tkinter import ttk, messagebox
import os
import sys
from mysql.connector import Error

# ============================================================
# DATABASE
# ============================================================

APP_DIR = os.path.dirname(os.path.abspath(__file__))

sys.path.append(
    os.path.abspath(
        os.path.join(APP_DIR, "..", "..")
    )
)

from db import get_connection


# ============================================================
# MÀU GIAO DIỆN
# ============================================================

COLOR_BG = "#f4f6f8"
COLOR_CARD = "#ffffff"
COLOR_BORDER = "#dfe3e8"
COLOR_PRIMARY = "#1f3a5f"
COLOR_TEXT = "#243447"
COLOR_MUTED = "#7f8c8d"

COLOR_SUCCESS = "#27ae60"
COLOR_SUCCESS_HOVER = "#1e8449"

COLOR_DANGER = "#e74c3c"
COLOR_DANGER_HOVER = "#c0392b"

COLOR_INFO = "#2980b9"
COLOR_INFO_HOVER = "#1f618d"


FONT_TITLE = ("Segoe UI", 16, "bold")
FONT_SECTION = ("Segoe UI", 12, "bold")
FONT_BODY = ("Segoe UI", 10)
FONT_BOLD = ("Segoe UI", 10, "bold")


# ============================================================
# LẤY THÔNG TIN PHÒNG / KHÁCH HÀNG CỦA BOOKING
# ============================================================

def get_booking_info(booking_id):

    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        cursor.execute("""
            SELECT
                r.room_number,
                c.name AS customer_name
            FROM bookings b
            JOIN rooms r
                ON b.room_id = r.id
            JOIN customers c
                ON b.customer_id = c.id
            WHERE b.id = %s
        """, (booking_id,))

        return cursor.fetchone()

    finally:
        cursor.close()
        conn.close()


# ============================================================
# LẤY DANH SÁCH VẬT TƯ
# ============================================================

def get_supplies():

    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        cursor.execute("""
            SELECT
                id,
                name,
                unit,
                price,
                quantity
            FROM supplies
            WHERE quantity > 0
            ORDER BY name
        """)

        return cursor.fetchall()

    finally:
        cursor.close()
        conn.close()


# ============================================================
# LẤY VẬT TƯ CỦA BOOKING
# ============================================================

def get_booking_supplies(booking_id):

    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        cursor.execute("""
            SELECT
                bs.id,
                bs.supply_id,
                s.name,
                s.unit,
                s.price,
                bs.quantity,
                (bs.quantity * s.price) AS total
            FROM booking_supplies bs
            JOIN supplies s
                ON bs.supply_id = s.id
            WHERE bs.booking_id = %s
            ORDER BY bs.id
        """, (booking_id,))

        return cursor.fetchall()

    finally:
        cursor.close()
        conn.close()


# ============================================================
# THÊM VẬT TƯ VÀO BOOKING
# ============================================================

def add_supply_to_booking(
    booking_id,
    supply_id,
    quantity
):

    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    try:

        # Kiểm tra số lượng tồn kho
        cursor.execute("""
            SELECT
                id,
                name,
                unit,
                price,
                quantity
            FROM supplies
            WHERE id = %s
            FOR UPDATE
        """, (supply_id,))

        supply = cursor.fetchone()

        if not supply:
            return False, "Không tìm thấy vật tư."

        if quantity <= 0:
            return False, "Số lượng phải lớn hơn 0."

        if quantity > supply["quantity"]:
            return False, (
                f"Vật tư '{supply['name']}' "
                f"chỉ còn {supply['quantity']} "
                f"{supply['unit']}."
            )

        # Kiểm tra vật tư đã có trong booking chưa
        cursor.execute("""
            SELECT
                id,
                quantity
            FROM booking_supplies
            WHERE booking_id = %s
              AND supply_id = %s
            FOR UPDATE
        """, (
            booking_id,
            supply_id
        ))

        existing = cursor.fetchone()

        if existing:

            cursor.execute("""
                UPDATE booking_supplies
                SET quantity = quantity + %s
                WHERE id = %s
            """, (
                quantity,
                existing["id"]
            ))

        else:

            cursor.execute("""
                INSERT INTO booking_supplies
                (
                    booking_id,
                    supply_id,
                    quantity
                )
                VALUES (%s, %s, %s)
            """, (
                booking_id,
                supply_id,
                quantity
            ))

        # Trừ tồn kho
        cursor.execute("""
            UPDATE supplies
            SET quantity = quantity - %s
            WHERE id = %s
        """, (
            quantity,
            supply_id
        ))

        conn.commit()

        return True, "Đã thêm vật tư vào booking."

    except Error as e:

        conn.rollback()

        return False, f"Lỗi database: {e}"

    finally:

        cursor.close()
        conn.close()


# XÓA VẬT TƯ KHỎI BOOKING

def remove_supply_from_booking(
    booking_supply_id
):

    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    try:

        cursor.execute("""
            SELECT
                bs.supply_id,
                bs.quantity,
                s.name
            FROM booking_supplies bs
            JOIN supplies s
                ON bs.supply_id = s.id
            WHERE bs.id = %s
            FOR UPDATE
        """, (booking_supply_id,))

        row = cursor.fetchone()

        if not row:
            return False, "Không tìm thấy vật tư."

        # Xóa khỏi booking
        cursor.execute("""
            DELETE FROM booking_supplies
            WHERE id = %s
        """, (booking_supply_id,))

        # Trả lại kho
        cursor.execute("""
            UPDATE supplies
            SET quantity = quantity + %s
            WHERE id = %s
        """, (
            row["quantity"],
            row["supply_id"]
        ))

        conn.commit()

        return True, (
            f"Đã xóa {row['name']} khỏi booking."
        )

    except Error as e:

        conn.rollback()

        return False, f"Lỗi database: {e}"

    finally:

        cursor.close()
        conn.close()


# ============================================================
# CỬA SỔ VẬT TƯ BOOKING
# ============================================================

class BookingSupplyWindow(tk.Toplevel):

    def __init__(
        self,
        parent,
        booking_id
    ):

        super().__init__(parent)

        self.booking_id = booking_id

        self.supply_map = {}
        self.all_booking_supplies = []

        # Thông tin phòng / khách hàng của booking
        self.booking_info = get_booking_info(booking_id)

        # ====================================================
        # CỬA SỔ
        # ====================================================

        self.title(
            f"Vật tư - Booking "
        )

        self.geometry(
            "1200x700"
        )

        self.minsize(
            950,
            600
        )

        self.resizable(
            True,
            True
        )

        self.configure(
            bg=COLOR_BG
        )

        self.grab_set()

        # ====================================================
        # STYLE
        # ====================================================

        self._setup_style()

        # ====================================================
        # GIAO DIỆN
        # ====================================================

        self._build_header()

        self._build_main()

        self.load_supplies()

        self.load_booking_supplies()


    # ========================================================
    # STYLE
    # ========================================================

    def _setup_style(self):

        style = ttk.Style()

        try:
            style.theme_use("clam")
        except:
            pass

        style.configure(
            "Supply.TButton",
            font=FONT_BOLD,
            padding=(14, 8),
            background=COLOR_SUCCESS,
            foreground="white",
            borderwidth=0
        )

        style.map(
            "Supply.TButton",
            background=[
                ("active", COLOR_SUCCESS_HOVER)
            ]
        )

        style.configure(
            "DeleteSupply.TButton",
            font=FONT_BOLD,
            padding=(12, 8),
            background=COLOR_DANGER,
            foreground="white",
            borderwidth=0
        )

        style.map(
            "DeleteSupply.TButton",
            background=[
                ("active", COLOR_DANGER_HOVER)
            ]
        )

        style.configure(
            "RefreshSupply.TButton",
            font=FONT_BOLD,
            padding=(12, 8),
            background="#eaf2f8",
            foreground=COLOR_PRIMARY,
            borderwidth=1
        )

        style.map(
            "RefreshSupply.TButton",
            background=[
                ("active", "#d6eaf8")
            ]
        )

        style.configure(
            "CloseSupply.TButton",
            font=FONT_BOLD,
            padding=(14, 8)
        )

        style.configure(
            "Supply.Treeview",
            background="white",
            foreground=COLOR_TEXT,
            rowheight=38,
            fieldbackground="white",
            font=FONT_BODY
        )

        style.configure(
            "Supply.Treeview.Heading",
            background="#edf2f7",
            foreground=COLOR_TEXT,
            font=FONT_BOLD,
            padding=8
        )

        style.map(
            "Supply.Treeview",
            background=[
                ("selected", "#d6e7f5")
            ],
            foreground=[
                ("selected", COLOR_TEXT)
            ]
        )


    # ========================================================
    # HEADER
    # ========================================================

    def _build_header(self):

        header = tk.Frame(
            self,
            bg=COLOR_PRIMARY,
            height=64
        )

        header.pack(
            fill="x"
        )

        header.pack_propagate(False)

        tk.Label(
            header,
            text="VẬT TƯ BOOKING",
            font=FONT_TITLE,
            bg=COLOR_PRIMARY,
            fg="white"
        ).pack(
            side="left",
            padx=(30, 0)
        )
    # ========================================================
    # MAIN
    # ========================================================

    def _build_main(self):

        main = tk.Frame(
            self,
            bg=COLOR_BG
        )

        main.pack(
            fill="both",
            expand=True,
            padx=16,
            pady=16
        )

        main.grid_columnconfigure(
            0,
            weight=0
        )

        main.grid_columnconfigure(
            1,
            weight=1
        )

        main.grid_rowconfigure(
            0,
            weight=1
        )

        # ====================================================
        # PANEL TRÁI
        # ====================================================

        left = tk.Frame(
            main,
            bg=COLOR_CARD,
            highlightbackground=COLOR_BORDER,
            highlightthickness=1
        )

        left.grid(
            row=0,
            column=0,
            sticky="nsew",
            padx=(0, 10)
        )

        left.configure(
            width=390
        )

        left.grid_propagate(False)

        self._build_add_panel(left)


        # ====================================================
        # PANEL PHẢI
        # ====================================================

        right = tk.Frame(
            main,
            bg=COLOR_CARD,
            highlightbackground=COLOR_BORDER,
            highlightthickness=1
        )

        right.grid(
            row=0,
            column=1,
            sticky="nsew"
        )

        right.grid_rowconfigure(
            2,
            weight=1
        )

        right.grid_columnconfigure(
            0,
            weight=1
        )

        self._build_list_panel(right)


    # ========================================================
    # PANEL THÊM VẬT TƯ
    # ========================================================

    def _build_add_panel(self, parent):

        # ----------------------------------------------------
        # THÔNG TIN PHÒNG / KHÁCH HÀNG
        # ----------------------------------------------------

        room_number = (
            self.booking_info["room_number"]
            if self.booking_info else "N/A"
        )

        customer_name = (
            self.booking_info["customer_name"]
            if self.booking_info else "N/A"
        )

        info_booking_frame = tk.Frame(
            parent,
            bg="#eef5fb",
            highlightbackground="#d9e7f3",
            highlightthickness=1
        )

        info_booking_frame.pack(
            fill="x",
            padx=18,
            pady=(20, 0)
        )

        tk.Label(
            info_booking_frame,
            text=f"Phòng: {room_number}",
            font=FONT_BOLD,
            bg="#eef5fb",
            fg=COLOR_PRIMARY
        ).pack(
            anchor="w",
            padx=12,
            pady=(10, 2)
        )

        tk.Label(
            info_booking_frame,
            text=f"Khách hàng: {customer_name}",
            font=FONT_BOLD,
            bg="#eef5fb",
            fg=COLOR_PRIMARY
        ).pack(
            anchor="w",
            padx=12,
            pady=(0, 10)
        )

        tk.Label(
            parent,
            text="VẬT TƯ",
            font=FONT_SECTION,
            bg=COLOR_CARD,
            fg=COLOR_TEXT
        ).pack(
            anchor="w",
            padx=18,
            pady=(16, 18)
        )


        # ----------------------------------------------------
        # VẬT TƯ
        # ----------------------------------------------------

        tk.Label(
            parent,
            text="Tên:",
            font=FONT_BODY,
            bg=COLOR_CARD,
            fg=COLOR_TEXT
        ).pack(
            anchor="w",
            padx=18
        )


        self.combo_supply = ttk.Combobox(
            parent,
            state="readonly",
            font=FONT_BODY,
            width=1
        )

        self.combo_supply.pack(
            fill="x",
            padx=18,
            pady=(7, 18),
            ipady=6
        )

        self.combo_supply.bind(
            "<<ComboboxSelected>>",
            self.on_supply_selected
        )


        # ----------------------------------------------------
        # SỐ LƯỢNG
        # ----------------------------------------------------

        tk.Label(
            parent,
            text="Số lượng:",
            font=FONT_BODY,
            bg=COLOR_CARD,
            fg=COLOR_TEXT
        ).pack(
            anchor="w",
            padx=18
        )


        quantity_frame = tk.Frame(
            parent,
            bg=COLOR_CARD
        )

        quantity_frame.pack(
            fill="x",
            padx=18,
            pady=(7, 18)
        )

        self.entry_quantity = tk.Entry(
            quantity_frame,
            font=FONT_BODY,
            relief="solid",
            borderwidth=1
        )

        self.entry_quantity.pack(
            side="left",
            fill="x",
            expand=True,
            ipady=7
        )

        self.lbl_unit = tk.Label(
            quantity_frame,
            text="",
            font=FONT_BODY,
            bg=COLOR_CARD,
            fg=COLOR_TEXT
        )

        self.lbl_unit.pack(
            side="left",
            padx=(12, 0)
        )

        self.entry_quantity.insert(
            0,
            "1"
        )


        # ----------------------------------------------------
        # THÔNG TIN GIÁ / KHO
        # ----------------------------------------------------

        info_frame = tk.Frame(
            parent,
            bg="#eef5fb",
            highlightbackground="#d9e7f3",
            highlightthickness=1
        )

        info_frame.pack(
            fill="x",
            padx=18,
            pady=(0, 20)
        )


        self.lbl_price = tk.Label(
            info_frame,
            text="Đơn giá: 0 VNĐ",
            font=FONT_BODY,
            bg="#eef5fb",
            fg=COLOR_TEXT
        )

        self.lbl_price.pack(
            side="left",
            padx=12,
            pady=12
        )


        tk.Label(
            info_frame,
            text="|",
            font=FONT_BODY,
            bg="#eef5fb",
            fg=COLOR_MUTED
        ).pack(
            side="left"
        )


        self.lbl_stock = tk.Label(
            info_frame,
            text="Tồn kho: 0",
            font=FONT_BODY,
            bg="#eef5fb",
            fg=COLOR_TEXT
        )

        self.lbl_stock.pack(
            side="left",
            padx=12,
            pady=12
        )


        # ----------------------------------------------------
        # NÚT THÊM
        # ----------------------------------------------------

        ttk.Button(
            parent,
            text="＋  THÊM VÀO BOOKING",
            style="Supply.TButton",
            command=self.add_supply
        ).pack(
            fill="x",
            padx=18,
            pady=(0, 18),
            ipady=3
        )


    # ========================================================
    # PANEL DANH SÁCH
    # ========================================================

    def _build_list_panel(self, parent):

        tk.Label(
            parent,
            text="VẬT TƯ ĐANG SỬ DỤNG",
            font=FONT_SECTION,
            bg=COLOR_CARD,
            fg=COLOR_TEXT
        ).grid(
            row=0,
            column=0,
            sticky="w",
            padx=20,
            pady=(20, 15)
        )


        # ====================================================
        # TOOLBAR
        # ====================================================

        toolbar = tk.Frame(
            parent,
            bg=COLOR_CARD
        )

        toolbar.grid(
            row=1,
            column=0,
            sticky="ew",
            padx=20,
            pady=(0, 12)
        )

        toolbar.grid_columnconfigure(
            3,
            weight=1
        )


        ttk.Button(
            toolbar,
            text="⟳  Làm mới",
            style="RefreshSupply.TButton",
            command=self.refresh
        ).grid(
            row=0,
            column=0,
            padx=(0, 10)
        )


        ttk.Button(
            toolbar,
            text="Xóa vật tư",
            style="DeleteSupply.TButton",
            command=self.remove_supply
        ).grid(
            row=0,
            column=1,
            padx=(0, 15)
        )


        # ----------------------------------------------------
        # SEARCH
        # ----------------------------------------------------

        self.search_var = tk.StringVar()

        self.entry_search = tk.Entry(
            toolbar,
            textvariable=self.search_var,
            font=FONT_BODY,
            relief="solid",
            borderwidth=1
        )

        self.entry_search.grid(
            row=0,
            column=3,
            sticky="e",
            ipadx=8,
            ipady=6
        )

        self.entry_search.insert(
            0,
            "Tìm theo tên vật tư..."
        )

        self.entry_search.config(
            fg=COLOR_MUTED
        )

        self.entry_search.bind(
            "<FocusIn>",
            self._search_focus_in
        )

        self.entry_search.bind(
            "<FocusOut>",
            self._search_focus_out
        )

        self.entry_search.bind(
            "<KeyRelease>",
            self.search_supply
        )


        # ====================================================
        # TABLE
        # ====================================================

        table_frame = tk.Frame(
            parent,
            bg=COLOR_CARD
        )

        table_frame.grid(
            row=2,
            column=0,
            sticky="nsew",
            padx=20,
            pady=(0, 12)
        )

        table_frame.grid_rowconfigure(
            0,
            weight=1
        )

        table_frame.grid_columnconfigure(
            0,
            weight=1
        )


        columns = (
            "stt",
            "name",
            "quantity",
            "unit",
            "price",
            "total"
        )


        self.tree = ttk.Treeview(
            table_frame,
            columns=columns,
            show="headings",
            style="Supply.Treeview"
        )


        self.tree.heading(
            "stt",
            text="STT"
        )

        self.tree.heading(
            "name",
            text="Tên vật tư"
        )

        self.tree.heading(
            "quantity",
            text="Số lượng"
        )

        self.tree.heading(
            "unit",
            text="Đơn vị"
        )

        self.tree.heading(
            "price",
            text="Đơn giá (VNĐ)"
        )

        self.tree.heading(
            "total",
            text="Thành tiền (VNĐ)"
        )


        self.tree.column(
            "stt",
            width=60,
            anchor="center",
            stretch=False
        )

        self.tree.column(
            "name",
            width=220,
            anchor="w"
        )

        self.tree.column(
            "quantity",
            width=100,
            anchor="center"
        )

        self.tree.column(
            "unit",
            width=100,
            anchor="center"
        )

        self.tree.column(
            "price",
            width=140,
            anchor="e"
        )

        self.tree.column(
            "total",
            width=160,
            anchor="e"
        )


        scrollbar = ttk.Scrollbar(
            table_frame,
            orient="vertical",
            command=self.tree.yview
        )

        self.tree.configure(
            yscrollcommand=scrollbar.set
        )


        self.tree.grid(
            row=0,
            column=0,
            sticky="nsew"
        )

        scrollbar.grid(
            row=0,
            column=1,
            sticky="ns"
        )


        # ====================================================
        # FOOTER
        # ====================================================

        footer = tk.Frame(
            parent,
            bg="#fafbfc",
            highlightbackground=COLOR_BORDER,
            highlightthickness=1
        )

        footer.grid(
            row=3,
            column=0,
            sticky="ew",
            padx=20,
            pady=(0, 20)
        )


        self.lbl_count = tk.Label(
            footer,
            text="Tổng số loại: 0",
            font=FONT_BOLD,
            bg="#fafbfc",
            fg=COLOR_TEXT
        )

        self.lbl_count.pack(
            side="left",
            padx=18,
            pady=15
        )


        self.lbl_total = tk.Label(
            footer,
            text="0 VNĐ",
            font=("Segoe UI", 16, "bold"),
            bg="#fafbfc",
            fg=COLOR_DANGER
        )

        self.lbl_total.pack(
            side="right",
            padx=18,
            pady=12
        )


        tk.Label(
            footer,
            text="Tổng thành tiền:",
            font=FONT_BOLD,
            bg="#fafbfc",
            fg=COLOR_TEXT
        ).pack(
            side="right"
        )


        # ====================================================
        # ĐÓNG
        # ====================================================

        close_frame = tk.Frame(
            parent,
            bg=COLOR_CARD
        )

        close_frame.grid(
            row=4,
            column=0,
            sticky="e",
            padx=20,
            pady=(0, 16)
        )


        ttk.Button(
            close_frame,
            text="✕  Đóng",
            style="CloseSupply.TButton",
            command=self.destroy
        ).pack()


    # ========================================================
    # LOAD VẬT TƯ
    # ========================================================

    def load_supplies(self):

        supplies = get_supplies()

        self.supply_map.clear()

        values = []

        for supply in supplies:

            display = supply['name']

            values.append(
                display
            )

            self.supply_map[
                display
            ] = supply


        self.combo_supply["values"] = values


        if values:

            self.combo_supply.current(0)

            self.on_supply_selected()

        else:

            self.combo_supply.set("")

            self.lbl_unit.config(
                text=""
            )

            self.lbl_price.config(
                text="Đơn giá: 0 VNĐ"
            )

            self.lbl_stock.config(
                text="Tồn kho: 0"
            )


    # ========================================================
    # CHỌN VẬT TƯ
    # ========================================================

    def on_supply_selected(
        self,
        event=None
    ):

        selected = self.combo_supply.get()

        supply = self.supply_map.get(
            selected
        )

        if not supply:
            return


        self.lbl_unit.config(
            text=supply["unit"]
        )

        self.lbl_price.config(
            text=(
                f"Đơn giá: "
                f"{float(supply['price']):,.0f} VNĐ"
            )
        )

        self.lbl_stock.config(
            text=(
                f"Tồn kho: "
                f"{supply['quantity']} "
                f"{supply['unit']}"
            )
        )


    # ========================================================
    # LOAD VẬT TƯ CỦA BOOKING
    # ========================================================

    def load_booking_supplies(self):

        for item in self.tree.get_children():
            self.tree.delete(item)


        self.all_booking_supplies = (
            get_booking_supplies(
                self.booking_id
            )
        )


        self._display_booking_supplies(
            self.all_booking_supplies
        )


    # ========================================================
    # HIỂN THỊ DANH SÁCH
    # ========================================================

    def _display_booking_supplies(
        self,
        rows
    ):

        for item in self.tree.get_children():
            self.tree.delete(item)


        total = 0


        for index, row in enumerate(
            rows,
            start=1
        ):

            price = float(
                row["price"]
            )

            amount = float(
                row["total"]
            )

            total += amount


            self.tree.insert(
                "",
                "end",
                iid=str(row["id"]),
                values=(
                    index,
                    row["name"],
                    row["quantity"],
                    row["unit"],
                    f"{price:,.0f}",
                    f"{amount:,.0f}"
                )
            )


        self.lbl_count.config(
            text=(
                f"Tổng số loại: {len(rows)}"
            )
        )

        self.lbl_total.config(
            text=(
                f"{total:,.0f} VNĐ"
            )
        )


    # ========================================================
    # TÌM KIẾM
    # ========================================================

    def search_supply(
        self,
        event=None
    ):

        text = self.search_var.get().strip()

        if text == "Tìm theo tên vật tư...":
            return


        text = text.lower()


        if not text:

            self._display_booking_supplies(
                self.all_booking_supplies
            )

            return


        filtered = [
            row
            for row in self.all_booking_supplies
            if text in row["name"].lower()
        ]


        self._display_booking_supplies(
            filtered
        )


    # ========================================================
    # SEARCH FOCUS
    # ========================================================

    def _search_focus_in(
        self,
        event=None
    ):

        if self.entry_search.get() == (
            "Tìm theo tên vật tư..."
        ):

            self.entry_search.delete(
                0,
                tk.END
            )

            self.entry_search.config(
                fg=COLOR_TEXT
            )


    def _search_focus_out(
        self,
        event=None
    ):

        if not self.entry_search.get().strip():

            self.entry_search.insert(
                0,
                "Tìm theo tên vật tư..."
            )

            self.entry_search.config(
                fg=COLOR_MUTED
            )


    # ========================================================
    # THÊM VẬT TƯ
    # ========================================================

    def add_supply(self):

        selected = self.combo_supply.get()

        if not selected:

            messagebox.showwarning(
                "Thông báo",
                "Vui lòng chọn vật tư.",
                parent=self
            )

            return


        supply = self.supply_map.get(
            selected
        )

        if not supply:
            return


        try:

            quantity = int(
                self.entry_quantity.get().strip()
            )

            if quantity <= 0:
                raise ValueError

        except ValueError:

            messagebox.showwarning(
                "Thông báo",
                "Số lượng phải là số nguyên lớn hơn 0.",
                parent=self
            )

            return


        if quantity > supply["quantity"]:

            messagebox.showwarning(
                "Thông báo",
                (
                    f"Kho chỉ còn "
                    f"{supply['quantity']} "
                    f"{supply['unit']}."
                ),
                parent=self
            )

            return


        ok, message = add_supply_to_booking(
            self.booking_id,
            supply["id"],
            quantity
        )


        if not ok:

            messagebox.showerror(
                "Lỗi",
                message,
                parent=self
            )

            return


        self.load_supplies()

        self.load_booking_supplies()


        self.entry_quantity.delete(
            0,
            tk.END
        )

        self.entry_quantity.insert(
            0,
            "1"
        )


    # ========================================================
    # XÓA VẬT TƯ
    # ========================================================

    def remove_supply(self):

        selected = self.tree.focus()

        if not selected:

            messagebox.showwarning(
                "Thông báo",
                "Vui lòng chọn vật tư cần xóa.",
                parent=self
            )

            return


        values = self.tree.item(
            selected,
            "values"
        )


        supply_name = values[1]
        quantity = values[2]


        confirm = messagebox.askyesno(
            "Xác nhận",
            (
                f"Bạn có chắc muốn xóa "
                f"{supply_name} × {quantity} "
                f"khỏi booking?"
            ),
            parent=self
        )


        if not confirm:
            return


        ok, message = remove_supply_from_booking(
            int(selected)
        )


        if not ok:

            messagebox.showerror(
                "Lỗi",
                message,
                parent=self
            )

            return


        self.load_supplies()

        self.load_booking_supplies()


    # LÀM MỚI

    def refresh(self):

        self.load_supplies()

        self.load_booking_supplies()

        self.search_var.set("")

        self.entry_search.delete(
            0,
            tk.END
        )

        self.entry_search.insert(
            0,
            "Tìm theo tên vật tư..."
        )

        self.entry_search.config(
            fg=COLOR_MUTED
        )


# HÀM MỞ CỬA SỔ

def open_booking_supply_window(
    parent,
    booking_id
):

    return BookingSupplyWindow(
        parent,
        booking_id
    )
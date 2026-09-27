import tkinter as tk
from tkinter import ttk, messagebox
import os
import sys
import subprocess

APP_DIR = os.path.dirname(os.path.abspath(__file__))

sys.path.append(
    os.path.abspath(
        os.path.join(APP_DIR, "..", "..")
    )
)

from db import get_connection

BG_COLOR = "#f4f6f8"
SIDEBAR_COLOR = "#1f2937"
WHITE = "#ffffff"
TEXT_COLOR = "#111827"
GRAY = "#6b7280"
BLUE = "#2563eb"
CARD_BORDER = "#e5e7eb"


class AdminApp:
    def __init__(self, root):
        self.root = root

        self.root.title("Hệ thống quản lý khách sạn")
        self.root.geometry("1250x720")
        self.root.minsize(1100, 650)
        self.root.configure(bg=BG_COLOR)

        self.create_sidebar()
        self.create_main_area()

        self.update_statistics()
        self.start_consultation_polling()

    def create_sidebar(self):
        self.sidebar = tk.Frame(
            self.root,
            bg=SIDEBAR_COLOR,
            width=230
        )

        self.sidebar.pack(
            side="left",
            fill="y"
        )

        self.sidebar.pack_propagate(False)

        title = tk.Label(
            self.sidebar,
            text="HOTEL",
            bg=SIDEBAR_COLOR,
            fg=WHITE,
            font=("Arial", 24, "bold")
        )

        title.pack(
            pady=(35, 0)
        )

        title2 = tk.Label(
            self.sidebar,
            text="MANAGEMENT",
            bg=SIDEBAR_COLOR,
            fg="#d1d5db",
            font=("Arial", 12, "bold")
        )

        title2.pack(
            pady=(0, 45)
        )

       
        self.create_sidebar_button(
            "👤  Khách hàng",
            self.open_customers
        )

        self.create_consultation_sidebar_button()

        self.create_sidebar_button(
            "🏠  Quản lý phòng",
            self.open_rooms
        )

        self.create_sidebar_button(
            "📅  Đặt phòng",
            self.open_bookings
        )

        self.create_sidebar_button(
            "💵  Hóa đơn / Thanh toán",
            self.open_invoices
        )
        self.create_sidebar_button(
            "🧰  Dịch vụ",
            self.open_supply
        )

        self.create_sidebar_button(
            "📊  Thống kê",
            self.open_statistics
        )

        spacer = tk.Frame(
            self.sidebar,
            bg=SIDEBAR_COLOR
        )

        spacer.pack(
            expand=True
        )

        exit_button = tk.Button(
            self.sidebar,
            text="🚪  Thoát",
            command=self.exit_program,
            bg="#374151",
            fg=WHITE,
            activebackground="#4b5563",
            activeforeground=WHITE,
            relief="flat",
            bd=0,
            font=("Arial", 10),
            cursor="hand2",
            height=2
        )

        exit_button.pack(
            fill="x",
            padx=20,
            pady=20
        )

    def create_sidebar_button(self, text, command):
        button = tk.Button(
            self.sidebar,
            text=text,
            command=command,
            bg=SIDEBAR_COLOR,
            fg=WHITE,
            activebackground="#374151",
            activeforeground=WHITE,
            relief="flat",
            bd=0,
            anchor="w",
            font=("Arial", 11),
            cursor="hand2",
            padx=25,
            height=2
        )

        button.pack(
            fill="x",
            padx=10,
            pady=4
        )

    # Nút sidebar riêng cho "Yêu cầu tư vấn" vì cần đè thêm badge số
    # (chấm đỏ kiểu Zalo) lên góc nút, nên không dùng chung
    # create_sidebar_button ở trên để tránh ảnh hưởng các nút khác.
    def create_consultation_sidebar_button(self):
        frame = tk.Frame(
            self.sidebar,
            bg=SIDEBAR_COLOR
        )

        frame.pack(
            fill="x",
            padx=10,
            pady=4
        )

        button = tk.Button(
            frame,
            text="💬  Yêu cầu tư vấn",
            command=self.open_consultation,
            bg=SIDEBAR_COLOR,
            fg=WHITE,
            activebackground="#374151",
            activeforeground=WHITE,
            relief="flat",
            bd=0,
            anchor="w",
            font=("Arial", 11),
            cursor="hand2",
            padx=25,
            height=2
        )

        button.pack(fill="x")

        badge = tk.Label(
            frame,
            bg="#e53935",
            fg=WHITE,
            font=("Arial", 8, "bold"),
            width=2
        )

        self.consultation_badge = badge

        def set_badge(count):
            if count <= 0:
                badge.place_forget()
            else:
                badge.config(text=str(count) if count <= 9 else "9+")
                badge.place(relx=0.92, rely=0.15, anchor="ne")

        self.set_consultation_badge = set_badge

    def create_main_area(self):
        self.main = tk.Frame(
            self.root,
            bg=BG_COLOR
        )

        self.main.pack(
            side="right",
            fill="both",
            expand=True
        )

        # HEADER
        header = tk.Frame(
            self.main,
            bg=WHITE,
            height=80
        )

        header.pack(
            fill="x"
        )

        header.pack_propagate(False)

        title = tk.Label(
            header,
            text="TRANG QUẢN TRỊ",
            bg=WHITE,
            fg=TEXT_COLOR,
            font=("Arial", 22, "bold")
        )

        title.pack(
            side="left",
            padx=30
        )

        refresh_button = tk.Button(
            header,
            text="Làm mới",
            command=self.on_refresh_click,
            bg=WHITE,
            fg=BLUE,
            activebackground="#eff6ff",
            activeforeground=BLUE,
            relief="flat",
            bd=0,
            font=("Arial", 11, "bold"),
            cursor="hand2",
            padx=10
)

        refresh_button.pack(
            side="right",
            padx=20
        )

        # CONTENT
        self.content = tk.Frame(
            self.main,
            bg=BG_COLOR
        )

        self.content.pack(
            fill="both",
            expand=True,
            padx=30,
            pady=25
        )

        title = tk.Label(
            self.content,
            text="Tổng quan hệ thống",
            bg=BG_COLOR,
            fg=TEXT_COLOR,
            font=("Arial", 19, "bold")
        )

        title.pack(
            anchor="w",
            pady=(0, 18)
        )

        # 4 CARD THỐNG KÊ NHANH
        self.create_quick_statistics()

        function_title = tk.Label(
            self.content,
            text="Chức năng quản lý",
            bg=BG_COLOR,
            fg=TEXT_COLOR,
            font=("Arial", 16, "bold")
        )

        function_title.pack(
            anchor="w",
            pady=(30, 15)
        )

        self.create_function_grid()

    def create_quick_statistics(self):
        frame = tk.Frame(
            self.content,
            bg=BG_COLOR
        )

        frame.pack(
            fill="x"
        )

        self.customer_value = self.create_quick_card(
            frame,
            "KHÁCH HÀNG"
        )

        self.room_value = self.create_quick_card(
            frame,
            "PHÒNG"
        )

        self.booking_value = self.create_quick_card(
            frame,
            "ĐẶT PHÒNG"
        )

        self.invoice_value = self.create_quick_card(
            frame,
            "HÓA ĐƠN"
        )

    def create_quick_card(self, parent, title):
        card = tk.Frame(
            parent,
            bg=WHITE,
            height=110,
            highlightbackground=CARD_BORDER,
            highlightthickness=1
        )

        card.pack(
            side="left",
            fill="both",
            expand=True,
            padx=5
        )

        card.pack_propagate(False)

        label = tk.Label(
            card,
            text=title,
            bg=WHITE,
            fg=GRAY,
            font=("Arial", 10, "bold")
        )

        label.pack(
            pady=(18, 5)
        )

        value = tk.Label(
            card,
            text="0",
            bg=WHITE,
            fg=BLUE,
            font=("Arial", 27, "bold")
        )

        value.pack()

        return value

    def create_function_grid(self):
        grid = tk.Frame(
            self.content,
            bg=BG_COLOR
        )

        grid.pack(
            fill="both",
            expand=True
        )

        # Hàng 1
        grid.rowconfigure(0, weight=1)
        grid.rowconfigure(1, weight=1)

        grid.columnconfigure(0, weight=1)
        grid.columnconfigure(1, weight=1)
        grid.columnconfigure(2, weight=1)

        self.create_function_card(
            grid,
            0,
            0,
            "👤",
            "Quản lý khách hàng",
            "Thêm, sửa, xóa và tìm kiếm khách hàng",
            self.open_customers
        )

        self.create_function_card(
            grid,
            0,
            1,
            "🏠",
            "Quản lý phòng",
            "Quản lý thông tin và trạng thái phòng",
            self.open_rooms
        )

        self.create_function_card(
            grid,
            0,
            2,
            "📅",
            "Quản lý đặt phòng",
            "Đặt phòng, check-in, check-out và đổi phòng",
            self.open_bookings
        )

        self.create_function_card(
            grid,
            1,
            0,
            "💵",
            "Hóa đơn / Thanh toán",
            "Tạo, cập nhật và xuất hóa đơn",
            self.open_invoices
        )
        self.create_function_card(
            grid,
            1,
            1,
            "🧰",
            "Quản lý dịch vụ",
            "Quản lý các dịch vụ được cung cấp cho khách hàng",
            self.open_supply
        )

        self.create_function_card(
            grid,
            1,
            2,
            "📊",
            "Thống kê",
            "Xem doanh thu và thống kê hoạt động khách sạn",
            self.open_statistics
        )


        

    def create_function_card(
        self,
        parent,
        row,
        column,
        icon,
        title,
        description,
        command
    ):
        card = tk.Frame(
            parent,
            bg=WHITE,
            highlightbackground=CARD_BORDER,
            highlightthickness=1,
            cursor="hand2"
        )

        card.grid(
            row=row,
            column=column,
            sticky="nsew",
            padx=7,
            pady=7
        )

        icon_label = tk.Label(
            card,
            text=icon,
            bg=WHITE,
            fg=BLUE,
            font=("Arial", 25)
        )

        icon_label.pack(
            pady=(18, 5)
        )

        title_label = tk.Label(
            card,
            text=title,
            bg=WHITE,
            fg=TEXT_COLOR,
            font=("Arial", 13, "bold")
        )

        title_label.pack(
            pady=3
        )

        description_label = tk.Label(
            card,
            text=description,
            bg=WHITE,
            fg=GRAY,
            font=("Arial", 9),
            wraplength=230
        )

        description_label.pack(
            pady=(5, 15)
        )

        # Cho phép click toàn bộ ô
        widgets = [
            card,
            icon_label,
            title_label,
            description_label
        ]

        for widget in widgets:
            widget.bind(
                "<Button-1>",
                lambda event: command()
            )

            widget.bind(
                "<Enter>",
                lambda event: self.card_hover(event, True)
            )

            widget.bind(
                "<Leave>",
                lambda event: self.card_hover(event, False)
            )

    def card_hover(self, event, entering):
        widget = event.widget

        if entering:
            widget.configure(
                cursor="hand2"
            )

    def open_window(self, filename):
        path = os.path.join(
            APP_DIR,
            filename
        )

        if not os.path.exists(path):
            messagebox.showerror(
                "Lỗi",
                f"Không tìm thấy chức năng:\n\n{filename}"
            )
            return

        try:
            subprocess.Popen(
                [sys.executable, path],
                cwd=APP_DIR
            )

        except Exception as e:
            messagebox.showerror(
                "Lỗi",
                f"Không thể mở chức năng:\n\n{e}"
            )

    def open_customers(self):
        self.open_window("customer_window.py")

    def open_consultation(self):
        self.open_window("consultation_window.py")


    def open_rooms(self):
        self.open_window("room_window.py")


    def open_bookings(self):
        self.open_window("booking_window.py")


    def open_invoices(self):
        self.open_window("gui_invoice.py")

    def open_supply(self):
        self.open_window("supply_window.py")


    def open_statistics(self):
        self.open_window("statistics_gui.py")

    def update_statistics(self):
        try:
            conn = get_connection()
            cursor = conn.cursor()

            cursor.execute(
                "SELECT COUNT(*) FROM customers"
            )
            customers = cursor.fetchone()[0]

            cursor.execute(
                "SELECT COUNT(*) FROM rooms"
            )
            rooms = cursor.fetchone()[0]

            cursor.execute(
                "SELECT COUNT(*) FROM bookings"
            )
            bookings = cursor.fetchone()[0]

            cursor.execute(
                "SELECT COUNT(*) FROM invoices"
            )
            invoices = cursor.fetchone()[0]

            cursor.close()
            conn.close()

            self.customer_value.config(
                text=str(customers)
            )

            self.room_value.config(
                text=str(rooms)
            )

            self.booking_value.config(
                text=str(bookings)
            )

            self.invoice_value.config(
                text=str(invoices)
            )

        except Exception as e:
            print("Không thể cập nhật thống kê nhanh:", e)

    def refresh_consultation_badge(self):
        try:
            conn = get_connection()
            cursor = conn.cursor()

            cursor.execute(
                "SELECT COUNT(*) FROM consultation_requests WHERE status = 'New'"
            )

            count = cursor.fetchone()[0]

            cursor.close()
            conn.close()

            self.set_consultation_badge(count)

        except Exception as e:
            print("Không thể cập nhật số yêu cầu tư vấn mới:", e)

    def start_consultation_polling(self):
        self.refresh_consultation_badge()
        self.root.after(15000, self.start_consultation_polling)

    def on_refresh_click(self):
        self.update_statistics()
        self.refresh_consultation_badge()

    def exit_program(self):
        result = messagebox.askyesno(
            "Xác nhận",
            "Bạn có chắc muốn thoát chương trình không?"
        )

        if result:
            self.root.destroy()


if __name__ == "__main__":
    root = tk.Tk()

    app = AdminApp(root)

    root.mainloop()
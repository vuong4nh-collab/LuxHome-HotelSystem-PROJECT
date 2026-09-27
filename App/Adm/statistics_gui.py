"""
statistics_gui.py
Giao diện GUI cho module Thống kê (Reports)
"""
import sys
import os
import tkinter as tk
from tkinter import ttk, messagebox
from datetime import datetime, timedelta

BASE_DIR = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "..")
)

if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

import statistics_service as stat_srv

COLOR_PRIMARY = "#1F4E78"
COLOR_SECONDARY = "#2F75B5"
COLOR_BG = "#F8FAFB"
COLOR_CARD = "#FFFFFF"
COLOR_HEADING = "#1F2937"
COLOR_TEXT = "#374151"
COLOR_BORDER = "#E5E7EB"

HEADER_POSITIVE_BG = "#E7F5EC"
HEADER_POSITIVE_FG = "#1E7A46"

HEADER_NEGATIVE_BG = "#FBEAEA"
HEADER_NEGATIVE_FG = "#B4232A"

HEADER_NEUTRAL_BG = "#EAF0F6"
HEADER_NEUTRAL_FG = COLOR_PRIMARY

FONT_FAMILY = "Segoe UI"
FONT_HEADING = (FONT_FAMILY, 10, "bold")
FONT_BODY = (FONT_FAMILY, 10)

ROOM_TYPE_VI = {
    "Standard": "Tiêu chuẩn",
    "Deluxe": "Cao cấp",
    "Suite": "Hạng sang",
}

PAYMENT_METHOD_VI = {
    "Cash": "Tiền mặt",
    "BankTransfer": "Chuyển khoản",
}

OUTER_PADX = 12

GAP = 10


class StatisticsWindow(tk.Frame):
    def __init__(self, master=None):
        super().__init__(master, bg=COLOR_BG)
        self._setup_style()
        self._build_filter()
        self._build_summary_cards()
        self._build_charts_section()
        self._build_details_table()
        self.refresh_data()

    def _setup_style(self):
        style = ttk.Style(self)
        try:
            style.theme_use("clam")
        except tk.TclError:
            pass

        style.configure("Treeview", font=FONT_BODY, rowheight=24,
                       background="#FFFFFF", foreground=COLOR_TEXT,
                       borderwidth=0, relief="flat")
        style.configure("Treeview.Heading", font=(FONT_FAMILY, 9, "bold"),
                        background=COLOR_CARD, foreground="#374151",
                       borderwidth=0, relief="flat")
        style.layout("Treeview", [
            ("Treeview.treearea", {"sticky": "nswe"})
        ])
       

    def _build_filter(self):
        """Phần chọn khoảng thời gian"""
        filter_frm = tk.Frame(self, bg=COLOR_BG)
        filter_frm.pack(fill="x", padx=OUTER_PADX, pady=12)

        card = tk.Frame(filter_frm, bg=COLOR_CARD, highlightthickness=1, highlightbackground=COLOR_BORDER)
        card.pack(fill="x")

        inner = tk.Frame(card, bg=COLOR_CARD)
        inner.pack(fill="x", padx=12, pady=12)

        tk.Label(inner, text="Khoảng thời gian:", font=FONT_HEADING,
                 bg=COLOR_CARD).pack(side="left", padx=5)

        today = datetime.now()
        default_start = (today - timedelta(days=30)).strftime("%Y-%m-%d")
        default_end = today.strftime("%Y-%m-%d")

        tk.Label(inner, text="Từ:", font=FONT_BODY, bg=COLOR_CARD).pack(side="left", padx=5)
        self.start_date_var = tk.StringVar(value=default_start)
        tk.Entry(inner, textvariable=self.start_date_var, width=12, font=FONT_BODY).pack(side="left", padx=5)

        tk.Label(inner, text="Đến:", font=FONT_BODY, bg=COLOR_CARD).pack(side="left", padx=5)
        self.end_date_var = tk.StringVar(value=default_end)
        tk.Entry(inner, textvariable=self.end_date_var, width=12, font=FONT_BODY).pack(side="left", padx=5)

        tk.Button(inner, text="Cập nhật", command=self.refresh_data,
                  bg=COLOR_SECONDARY, fg="white", relief="flat", padx=20,
                  font=FONT_HEADING, cursor="hand2").pack(side="left", padx=10)

    def _build_summary_cards(self):
       
        cards_frm1 = tk.Frame(self, bg=COLOR_BG)
        cards_frm1.pack(fill="x", padx=OUTER_PADX, pady=(0, GAP))
        for c in range(3):
            cards_frm1.columnconfigure(c, weight=1, uniform="card_col")

        self.revenue_card = self._create_card(
            cards_frm1, "Doanh thu đã thu", "0 ₫", HEADER_POSITIVE_FG, HEADER_POSITIVE_BG)
        self.revenue_card.grid(row=0, column=0, sticky="nsew", padx=(0, GAP // 2))

        self.room_revenue_card = self._create_card(
            cards_frm1, "Doanh thu từ phòng", "0 ₫", HEADER_NEUTRAL_FG, HEADER_NEUTRAL_BG)
        self.room_revenue_card.grid(row=0, column=1, sticky="nsew", padx=GAP // 2)

        self.service_revenue_card = self._create_card(
            cards_frm1, "Doanh thu từ dịch vụ", "0 ₫", HEADER_NEUTRAL_FG, HEADER_NEUTRAL_BG)
        self.service_revenue_card.grid(row=0, column=2, sticky="nsew", padx=(GAP // 2, 0))

        cards_frm2 = tk.Frame(self, bg=COLOR_BG)
        cards_frm2.pack(fill="x", padx=OUTER_PADX, pady=(0, GAP))
        for c in range(3):
            cards_frm2.columnconfigure(c, weight=1, uniform="card_col")

        self.unpaid_card = self._create_card(
            cards_frm2, "Tiền chưa thu", "0 ₫", HEADER_NEGATIVE_FG, HEADER_NEGATIVE_BG)
        self.unpaid_card.grid(row=0, column=0, sticky="nsew", padx=(0, GAP // 2))

        self.bookings_card = self._create_card(
            cards_frm2, "Số lượt đặt phòng", "0", HEADER_NEUTRAL_FG, HEADER_NEUTRAL_BG)
        self.bookings_card.grid(row=0, column=1, sticky="nsew", padx=GAP // 2)

        self.customers_card = self._create_card(
            cards_frm2, "Khách hàng", "0", HEADER_NEUTRAL_FG, HEADER_NEUTRAL_BG)
        self.customers_card.grid(row=0, column=2, sticky="nsew", padx=(GAP // 2, 0))

    def _create_card(self, parent, title, value, color_header, color_bg):
        card = tk.Frame(parent, bg=COLOR_CARD, relief="flat", bd=0,
                         highlightthickness=1, highlightbackground=COLOR_BORDER)

        header = tk.Frame(card, bg=color_bg)
        header.pack(fill="x", padx=0, pady=0)

        title_lbl = tk.Label(header, text=title, font=(FONT_FAMILY, 9, "bold"),
                            bg=color_bg, fg=color_header)
        title_lbl.pack(pady=10, padx=10)

        value_frm = tk.Frame(card, bg=COLOR_CARD)
        value_frm.pack(fill="both", expand=True, padx=12, pady=16)

        value_lbl = tk.Label(value_frm, text=value, font=(FONT_FAMILY, 16, "bold"),
                            bg=COLOR_CARD, fg=COLOR_HEADING)
        value_lbl.pack(expand=True)

        card.value_lbl = value_lbl
        return card

    def _build_charts_section(self):
        charts_frm = tk.Frame(self, bg=COLOR_BG)
        charts_frm.pack(fill="both", expand=True, padx=OUTER_PADX, pady=(0, GAP))
        charts_frm.columnconfigure(0, weight=1, uniform="chart_col")
        charts_frm.columnconfigure(1, weight=1, uniform="chart_col")
        charts_frm.rowconfigure(0, weight=1)

        left_frm = tk.Frame(charts_frm, bg=COLOR_CARD, relief="flat", bd=0,
                             highlightthickness=1, highlightbackground=COLOR_BORDER)
        left_frm.grid(row=0, column=0, sticky="nsew", padx=(0, GAP // 2))

        header_left = tk.Frame(left_frm, bg=HEADER_NEUTRAL_BG)
        header_left.pack(fill="x", padx=0, pady=0)
        tk.Label(header_left, text="Doanh thu theo phương thức", font=(FONT_FAMILY, 9, "bold"),
                 bg=HEADER_NEUTRAL_BG, fg=HEADER_NEUTRAL_FG).pack(pady=10, padx=10)

        self.payment_tree = ttk.Treeview(left_frm, columns=("method", "amount"),
                                        show="headings", height=6)
        self.payment_tree.heading("method", text="Phương thức")
        self.payment_tree.heading("amount", text="Số tiền")
        self.payment_tree.column("method", width=150)
        self.payment_tree.column("amount", width=150)
        self.payment_tree.pack(fill="both", expand=True, padx=10, pady=(0, 10))

        right_frm = tk.Frame(charts_frm, bg=COLOR_CARD, relief="flat", bd=0,
                              highlightthickness=1, highlightbackground=COLOR_BORDER)
        right_frm.grid(row=0, column=1, sticky="nsew", padx=(GAP // 2, 0))

        header_right = tk.Frame(right_frm, bg=HEADER_NEUTRAL_BG)
        header_right.pack(fill="x", padx=0, pady=0)
        tk.Label(header_right, text="Doanh thu theo loại phòng", font=(FONT_FAMILY, 9, "bold"),
                 bg=HEADER_NEUTRAL_BG, fg=HEADER_NEUTRAL_FG).pack(pady=10, padx=10)

        self.room_tree = ttk.Treeview(right_frm, columns=("type", "amount"),
                                     show="headings", height=6)
        self.room_tree.heading("type", text="Loại phòng")
        self.room_tree.heading("amount", text="Số tiền")
        self.room_tree.column("type", width=150)
        self.room_tree.column("amount", width=150)
        self.room_tree.pack(fill="both", expand=True, padx=10, pady=(0, 10))

    def _build_details_table(self):
        details_frm = tk.Frame(self, bg=COLOR_BG)
        details_frm.pack(fill="both", expand=True, padx=OUTER_PADX, pady=(0, OUTER_PADX))

        card = tk.Frame(details_frm, bg=COLOR_CARD, highlightthickness=1, highlightbackground=COLOR_BORDER)
        card.pack(fill="both", expand=True)

        header_frm = tk.Frame(card, bg=HEADER_NEUTRAL_BG)
        header_frm.pack(fill="x", padx=0, pady=0)
        tk.Label(header_frm, text="Chi tiết các hóa đơn", font=(FONT_FAMILY, 9, "bold"),
                 bg=HEADER_NEUTRAL_BG, fg=HEADER_NEUTRAL_FG).pack(pady=10, padx=10, anchor="w")

        columns = ("id", "booking", "customer", "room", "room_type", "amount", "status", "payment", "date")
        self.details_tree = ttk.Treeview(card, columns=columns, show="headings", height=8)

        headers = ["Mã HĐ", "Booking", "Khách hàng", "Phòng", "Loại", "Số tiền", "Trạng thái", "Thanh toán", "Ngày"]
        widths = [50, 60, 120, 60, 80, 100, 100, 100, 130]

        for col, head, width in zip(columns, headers, widths):
            self.details_tree.heading(col, text=head)
            self.details_tree.column(col, width=width, anchor="center", stretch=True)

        self.details_tree.pack(fill="both", expand=True, padx=10, pady=(0, 10))
        def _stretch_last_column(event):
            fixed_total = sum(widths[:-1])
            remaining = self.details_tree.winfo_width() - fixed_total
            if remaining > widths[-1]:
                self.details_tree.column(columns[-1], width=remaining)
        self.details_tree.bind("<Configure>", _stretch_last_column)

    def refresh_data(self):
        try:
            start = self.start_date_var.get()
            end = self.end_date_var.get()

            datetime.strptime(start, "%Y-%m-%d")
            datetime.strptime(end, "%Y-%m-%d")

            stats = stat_srv.get_statistics(start, end)

            self.revenue_card.value_lbl.config(text=f"{stats['total_revenue']:,.0f} ₫")
            self.room_revenue_card.value_lbl.config(text=f"{stats['room_revenue']:,.0f} ₫")
            self.service_revenue_card.value_lbl.config(text=f"{stats['service_revenue']:,.0f} ₫")
            self.unpaid_card.value_lbl.config(text=f"{stats['total_unpaid']:,.0f} ₫")
            self.bookings_card.value_lbl.config(text=str(stats['total_bookings']))
            self.customers_card.value_lbl.config(text=str(stats['total_customers']))

            for item in self.payment_tree.get_children():
                self.payment_tree.delete(item)
            for method, amount in stats.get("revenue_by_payment", {}).items():
                display_method = PAYMENT_METHOD_VI.get(method, method)
                self.payment_tree.insert("", "end", values=(display_method, f"{amount:,.0f} ₫"))

            for item in self.room_tree.get_children():
                self.room_tree.delete(item)
            for room_type, amount in stats.get("revenue_by_room_type", {}).items():
                display_type = ROOM_TYPE_VI.get(room_type, room_type)
                self.room_tree.insert("", "end", values=(display_type, f"{amount:,.0f} ₫"))

            for item in self.details_tree.get_children():
                self.details_tree.delete(item)

            rows = stat_srv.get_invoice_rows(start, end)
            for i, row in enumerate(rows):
                room_type_vi = ROOM_TYPE_VI.get(row["room_type"], row["room_type"])
                payment_vi = PAYMENT_METHOD_VI.get(row["payment_method"], row["payment_method"])

                self.details_tree.insert("", "end", values=(
                    row["id"],
                    row["booking_id"],
                    row["customer_name"],
                    row["room_number"],
                    room_type_vi,
                    f"{row['amount']:,.0f} ₫",
                    row["status"],
                    payment_vi,
                    str(row["created_at"])[:10]
                ))

        except ValueError:
            messagebox.showerror("Lỗi", "Định dạng ngày không hợp lệ (YYYY-MM-DD)")
        except Exception as e:
            messagebox.showerror("Lỗi", f"Không thể cập nhật thống kê:\n{str(e)}")


if __name__ == "__main__":
    root = tk.Tk()
    root.title("Thống kê - Khách sạn")
    root.geometry("1400x850")
    root.minsize(1100, 700)
    root.configure(bg=COLOR_BG)

    window = StatisticsWindow(root)
    window.pack(fill="both", expand=True)

    root.mainloop()
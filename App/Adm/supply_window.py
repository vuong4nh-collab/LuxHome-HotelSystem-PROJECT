import tkinter as tk
from tkinter import ttk, messagebox
import os
import sys

# ============================================================
# IMPORT DATABASE
# ============================================================

APP_DIR = os.path.dirname(os.path.abspath(__file__))

sys.path.append(
    os.path.abspath(
        os.path.join(APP_DIR, "..", "..")
    )
)

from db import get_connection
from mysql.connector import Error


# ============================================================
# MÀU GIAO DIỆN
# ============================================================

COLOR_BG = "#f4f6f8"
COLOR_CARD = "#ffffff"
COLOR_BORDER = "#dfe3e8"
COLOR_PRIMARY = "#1f3a5f"
COLOR_PRIMARY_DARK = "#152a45"
COLOR_TEXT = "#243447"
COLOR_GRAY = "#7f8c8d"

COLOR_ADD = "#27ae60"
COLOR_ADD_DARK = "#1e8449"

COLOR_EDIT = "#2980b9"
COLOR_EDIT_DARK = "#1f618d"

COLOR_DELETE = "#c0392b"
COLOR_DELETE_DARK = "#96281b"

COLOR_RESET = "#7f8c8d"
COLOR_RESET_DARK = "#616a6b"


FONT_TITLE = ("Segoe UI", 16, "bold")
FONT_HEADING = ("Segoe UI", 10, "bold")
FONT_BODY = ("Segoe UI", 10)


# ============================================================
# DATABASE
# ============================================================

def get_supplies():
    """
    Lấy toàn bộ danh sách vật tư.
    """

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
            ORDER BY id DESC
        """)

        return cursor.fetchall()

    finally:
        cursor.close()
        conn.close()


def add_supply(name, unit, price, quantity):
    """
    Thêm vật tư mới.
    """

    conn = get_connection()
    cursor = conn.cursor()

    try:
        cursor.execute("""
            INSERT INTO supplies
            (
                name,
                unit,
                price,
                quantity
            )
            VALUES (%s, %s, %s, %s)
        """, (
            name,
            unit,
            price,
            quantity
        ))

        conn.commit()

        return True, "Thêm thành công."

    except Error as e:

        conn.rollback()

        return False, str(e)

    finally:
        cursor.close()
        conn.close()


def update_supply(
    supply_id,
    name,
    unit,
    price,
    quantity
):
    """
    Cập nhật thông tin vật tư.
    """

    conn = get_connection()
    cursor = conn.cursor()

    try:
        cursor.execute("""
            UPDATE supplies
            SET
                name = %s,
                unit = %s,
                price = %s,
                quantity = %s
            WHERE id = %s
        """, (
            name,
            unit,
            price,
            quantity,
            supply_id
        ))

        conn.commit()

        return True, "Cập nhật thành công."

    except Error as e:

        conn.rollback()

        return False, str(e)

    finally:
        cursor.close()
        conn.close()


def delete_supply(supply_id):
    """
    Xóa vật tư.
    """

    conn = get_connection()
    cursor = conn.cursor()

    try:
        cursor.execute("""
            DELETE FROM supplies
            WHERE id = %s
        """, (supply_id,))

        conn.commit()

        return True, "Xóa thành công."

    except Error as e:

        conn.rollback()

        return False, str(e)

    finally:
        cursor.close()
        conn.close()


# ============================================================
# GIAO DIỆN
# ============================================================

class SupplyWindow(tk.Frame):

    def __init__(self, master=None):

        super().__init__(
            master,
            bg=COLOR_BG
        )

        self.master = master

        self.selected_id = None

        self._build_style()
        self._build_header()
        self._build_form()
        self._build_table()

        self.load_supplies()


    # ========================================================
    # STYLE
    # ========================================================

    def _build_style(self):

        style = ttk.Style()

        style.theme_use("clam")

        style.configure(
            "Treeview",
            background=COLOR_CARD,
            fieldbackground=COLOR_CARD,
            foreground=COLOR_TEXT,
            rowheight=34,
            font=FONT_BODY,
            borderwidth=0
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
            background=[
                ("selected", "#d6e4f0")
            ],
            foreground=[
                ("selected", COLOR_TEXT)
            ]
        )

        button_specs = {

            "Add": (
                COLOR_ADD,
                COLOR_ADD_DARK
            ),

            "Edit": (
                COLOR_EDIT,
                COLOR_EDIT_DARK
            ),

            "Delete": (
                COLOR_DELETE,
                COLOR_DELETE_DARK
            ),

            "Reset": (
                COLOR_RESET,
                COLOR_RESET_DARK
            )
        }

        for name, (base, active) in button_specs.items():

            style.configure(
                f"{name}.TButton",
                background=base,
                foreground="white",
                font=FONT_BODY,
                padding=(14, 7),
                borderwidth=0,
                focusthickness=0
            )

            style.map(
                f"{name}.TButton",
                background=[
                    ("active", active)
                ]
            )


    # ========================================================
    # HEADER
    # ========================================================

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

        tk.Label(
            header,
            text="QUẢN LÝ DỊCH VỤ",
            font=FONT_TITLE,
            bg=COLOR_PRIMARY,
            fg="white"
        ).pack(
            side="left",
            padx=15
        )

        back_button = tk.Button(
            header,
            text="← Quay về",
            command=self.go_back,
            bg=COLOR_PRIMARY,
            fg="white",
            activebackground=COLOR_PRIMARY,
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


    # ========================================================
    # QUAY VỀ
    # ========================================================

    def go_back(self):

        self.master.destroy()


    # ========================================================
    # FORM
    # ========================================================

    def _build_form(self):

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

        card.pack(
            fill="x"
        )

        tk.Label(
            card,
            text="Thông tin dịch vụ",
            bg=COLOR_CARD,
            fg=COLOR_TEXT,
            font=("Segoe UI", 12, "bold")
        ).grid(
            row=0,
            column=0,
            columnspan=4,
            sticky="w",
            padx=20,
            pady=(16, 12)
        )


        # ====================================================
        # ID
        # ====================================================

        tk.Label(
            card,
            text="ID",
            bg=COLOR_CARD,
            fg=COLOR_GRAY,
            font=FONT_BODY
        ).grid(
            row=1,
            column=0,
            sticky="w",
            padx=(20, 8),
            pady=6
        )

        self.entry_id = tk.Entry(
            card,
            width=18,
            state="readonly",
            readonlybackground="#f1f3f5",
            relief="solid",
            bd=1
        )

        self.entry_id.grid(
            row=1,
            column=1,
            sticky="w",
            padx=(0, 30),
            pady=6
        )


        # ====================================================
        # TÊN VẬT TƯ
        # ====================================================

        tk.Label(
            card,
            text="Tên",
            bg=COLOR_CARD,
            fg=COLOR_GRAY,
            font=FONT_BODY
        ).grid(
            row=1,
            column=2,
            sticky="w",
            padx=(0, 8),
            pady=6
        )

        self.entry_name = tk.Entry(
            card,
            width=30,
            relief="solid",
            bd=1,
            font=FONT_BODY
        )

        self.entry_name.grid(
            row=1,
            column=3,
            sticky="w",
            padx=(0, 20),
            pady=6
        )


        # ====================================================
        # ĐƠN VỊ
        # ====================================================

        tk.Label(
            card,
            text="Đơn vị",
            bg=COLOR_CARD,
            fg=COLOR_GRAY,
            font=FONT_BODY
        ).grid(
            row=2,
            column=0,
            sticky="w",
            padx=(20, 8),
            pady=6
        )

        self.entry_unit = tk.Entry(
            card,
            width=18,
            relief="solid",
            bd=1,
            font=FONT_BODY
        )

        self.entry_unit.grid(
            row=2,
            column=1,
            sticky="w",
            padx=(0, 30),
            pady=6
        )


        # ====================================================
        # ĐƠN GIÁ
        # ====================================================

        tk.Label(
            card,
            text="Đơn giá",
            bg=COLOR_CARD,
            fg=COLOR_GRAY,
            font=FONT_BODY
        ).grid(
            row=2,
            column=2,
            sticky="w",
            padx=(0, 8),
            pady=6
        )

        self.entry_price = tk.Entry(
            card,
            width=30,
            relief="solid",
            bd=1,
            font=FONT_BODY
        )

        self.entry_price.grid(
            row=2,
            column=3,
            sticky="w",
            padx=(0, 20),
            pady=6
        )


        # ====================================================
        # SỐ LƯỢNG
        # ====================================================

        tk.Label(
            card,
            text="Số lượng tồn",
            bg=COLOR_CARD,
            fg=COLOR_GRAY,
            font=FONT_BODY
        ).grid(
            row=3,
            column=0,
            sticky="w",
            padx=(20, 8),
            pady=6
        )

        self.entry_quantity = tk.Entry(
            card,
            width=18,
            relief="solid",
            bd=1,
            font=FONT_BODY
        )

        self.entry_quantity.grid(
            row=3,
            column=1,
            sticky="w",
            padx=(0, 30),
            pady=6
        )


        # ====================================================
        # BUTTON
        # ====================================================

        button_frame = tk.Frame(
            card,
            bg=COLOR_CARD
        )

        button_frame.grid(
            row=4,
            column=0,
            columnspan=4,
            sticky="w",
            padx=20,
            pady=(12, 18)
        )


        ttk.Button(
            button_frame,
            text="Thêm",
            style="Add.TButton",
            command=self.on_add
        ).pack(
            side="left",
            padx=(0, 8)
        )


        ttk.Button(
            button_frame,
            text="Cập nhật",
            style="Edit.TButton",
            command=self.on_update
        ).pack(
            side="left",
            padx=8
        )


        ttk.Button(
            button_frame,
            text="Xóa",
            style="Delete.TButton",
            command=self.on_delete
        ).pack(
            side="left",
            padx=8
        )


        ttk.Button(
            button_frame,
            text="Làm mới",
            style="Reset.TButton",
            command=self.on_reset
        ).pack(
            side="left",
            padx=8
        )


    # ========================================================
    # TABLE
    # ========================================================

    def _build_table(self):

        outer = tk.Frame(
            self,
            bg=COLOR_BG
        )

        outer.pack(
            fill="both",
            expand=True,
            padx=16,
            pady=(0, 16)
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


        tk.Label(
            card,
            text="Danh sách",
            bg=COLOR_CARD,
            fg=COLOR_TEXT,
            font=("Segoe UI", 12, "bold")
        ).pack(
            anchor="w",
            padx=20,
            pady=(15, 8)
        )


        table_frame = tk.Frame(
            card,
            bg=COLOR_CARD
        )

        table_frame.pack(
            fill="both",
            expand=True,
            padx=12,
            pady=(0, 12)
        )


        columns = (
            "id",
            "name",
            "unit",
            "price",
            "quantity"
        )


        self.tree = ttk.Treeview(
            table_frame,
            columns=columns,
            show="headings"
        )


        headers = {
            "id": "ID",
            "name": "Tên",
            "unit": "Đơn vị",
            "price": "Đơn giá",
            "quantity": "Số lượng tồn"
        }


        widths = {
            "id": 70,
            "name": 250,
            "unit": 120,
            "price": 150,
            "quantity": 150
        }


        for col in columns:

            self.tree.heading(
                col,
                text=headers[col]
            )

            self.tree.column(
                col,
                width=widths[col],
                anchor="center"
            )


        # Scroll dọc

        vsb = ttk.Scrollbar(
            table_frame,
            orient="vertical",
            command=self.tree.yview
        )

        self.tree.configure(
            yscrollcommand=vsb.set
        )


        self.tree.pack(
            side="left",
            fill="both",
            expand=True
        )

        vsb.pack(
            side="right",
            fill="y"
        )


        # Scroll ngang

        hsb = ttk.Scrollbar(
            table_frame,
            orient="horizontal",
            command=self.tree.xview
        )

        self.tree.configure(
            xscrollcommand=hsb.set
        )

        hsb.pack(
            side="bottom",
            fill="x"
        )


        self.tree.bind(
            "<<TreeviewSelect>>",
            self.on_select
        )


    # ========================================================
    # LOAD DATA
    # ========================================================

    def load_supplies(self):

        for item in self.tree.get_children():

            self.tree.delete(item)


        rows = get_supplies()


        for index, row in enumerate(rows):

            price = float(row["price"])

            self.tree.insert(
                "",
                "end",
                iid=str(row["id"]),
                values=(
                    row["id"],
                    row["name"],
                    row["unit"],
                    f"{price:,.0f}",
                    row["quantity"]
                ),
                tags=(
                    "oddrow"
                    if index % 2
                    else "evenrow"
                )
            )


        self.tree.tag_configure(
            "oddrow",
            background="#f7f9fb"
        )

        self.tree.tag_configure(
            "evenrow",
            background=COLOR_CARD
        )


    # ========================================================
    # CHỌN VẬT TƯ
    # ========================================================

    def on_select(self, event):

        selected = self.tree.focus()

        if not selected:
            return


        values = self.tree.item(
            selected,
            "values"
        )

        if not values:
            return


        self.selected_id = int(values[0])


        self._set_entry(
            self.entry_id,
            values[0]
        )

        self._set_entry(
            self.entry_name,
            values[1]
        )

        self._set_entry(
            self.entry_unit,
            values[2]
        )

        self._set_entry(
            self.entry_price,
            values[3].replace(",", "")
        )

        self._set_entry(
            self.entry_quantity,
            values[4]
        )


    # ========================================================
    # SET ENTRY
    # ========================================================

    def _set_entry(self, entry, value):

        if entry == self.entry_id:

            entry.config(
                state="normal"
            )

            entry.delete(
                0,
                tk.END
            )

            entry.insert(
                0,
                value
            )

            entry.config(
                state="readonly"
            )

        else:

            entry.delete(
                0,
                tk.END
            )

            entry.insert(
                0,
                value
            )


    # ========================================================
    # LẤY DỮ LIỆU FORM
    # ========================================================

    def get_form_data(self):

        name = self.entry_name.get().strip()
        unit = self.entry_unit.get().strip()
        price_text = self.entry_price.get().strip()
        quantity_text = self.entry_quantity.get().strip()


        if not name:

            messagebox.showwarning(
                "Thông báo",
                "Vui lòng nhập tên."
            )

            return None


        if not unit:

            messagebox.showwarning(
                "Thông báo",
                "Vui lòng nhập đơn vị."
            )

            return None


        # Giá

        try:

            price = float(
                price_text.replace(",", "")
            )

            if price < 0:
                raise ValueError

        except ValueError:

            messagebox.showwarning(
                "Thông báo",
                "Đơn giá không hợp lệ."
            )

            return None


        # Số lượng

        try:

            quantity = int(
                quantity_text
            )

            if quantity < 0:
                raise ValueError

        except ValueError:

            messagebox.showwarning(
                "Thông báo",
                "Số lượng phải là số nguyên không âm."
            )

            return None


        return (
            name,
            unit,
            price,
            quantity
        )


    # ========================================================
    # THÊM
    # ========================================================

    def on_add(self):

        data = self.get_form_data()

        if data is None:
            return


        name, unit, price, quantity = data


        ok, message = add_supply(
            name,
            unit,
            price,
            quantity
        )


        if ok:

            messagebox.showinfo(
                "Thành công",
                message
            )

            self.on_reset()

            self.load_supplies()

        else:

            messagebox.showerror(
                "Lỗi",
                message
            )


    # ========================================================
    # CẬP NHẬT
    # ========================================================

    def on_update(self):

        if not self.selected_id:

            messagebox.showwarning(
                "Thông báo",
                "Vui lòng chọn cần cập nhật."
            )

            return


        data = self.get_form_data()

        if data is None:
            return


        name, unit, price, quantity = data


        ok, message = update_supply(
            self.selected_id,
            name,
            unit,
            price,
            quantity
        )


        if ok:

            messagebox.showinfo(
                "Thành công",
                message
            )

            self.on_reset()

            self.load_supplies()

        else:

            messagebox.showerror(
                "Lỗi",
                message
            )


    # ========================================================
    # XÓA
    # ========================================================

    def on_delete(self):

        if not self.selected_id:

            messagebox.showwarning(
                "Thông báo",
                "Vui lòng chọn cần xóa."
            )

            return


        name = self.entry_name.get().strip()


        confirm = messagebox.askyesno(
            "Xác nhận",
            f"Bạn có chắc muốn xóa:\n\n{name}?"
        )


        if not confirm:
            return


        ok, message = delete_supply(
            self.selected_id
        )


        if ok:

            messagebox.showinfo(
                "Thành công",
                message
            )

            self.on_reset()

            self.load_supplies()

        else:

            messagebox.showerror(
                "Không thể xóa",
                "Có thể đã được sử dụng trong booking.\n"
                "Không thể xóa vì dữ liệu đang được tham chiếu."
            )


    # ========================================================
    # LÀM MỚI
    # ========================================================

    def on_reset(self):

        self.selected_id = None


        self._set_entry(
            self.entry_id,
            ""
        )


        self.entry_name.delete(
            0,
            tk.END
        )

        self.entry_unit.delete(
            0,
            tk.END
        )

        self.entry_price.delete(
            0,
            tk.END
        )

        self.entry_quantity.delete(
            0,
            tk.END
        )


        for item in self.tree.selection():

            self.tree.selection_remove(item)


        self.load_supplies()




if __name__ == "__main__":

    root = tk.Tk()

    root.title(
        "Quản lý dịch vụ"
    )

    root.geometry(
        "950x650"
    )

    root.minsize(
        850,
        550
    )


    app = SupplyWindow(
        root
    )

    app.pack(
        fill="both",
        expand=True
    )


    root.mainloop()

import mysql.connector
from mysql.connector import Error

DB_CONFIG = {
    "host": "localhost",
    "user": "root",
    "password": "123456",
    "database": "ql_khachsan"
}
def get_connection():
    return mysql.connector.connect(**DB_CONFIG)
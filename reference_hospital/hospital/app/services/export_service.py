import io
from typing import Dict, Any
import openpyxl
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas

def export_to_excel(data: Dict[str, Any], filename: str = "dashboard_report.xlsx") -> bytes:
    """تحويل بيانات لوحة التحكم إلى ملف Excel باستخدام openpyxl"""
    wb = openpyxl.Workbook()
    
    # Sheet 1: Summary & Financials
    ws_summary = wb.active
    ws_summary.title = "الملخص والإيرادات"
    
    ws_summary.append(["البيان", "القيمة"])
    ws_summary.append(["الفترة", data.get("period", "آخر 30 يوم")])
    ws_summary.append(["إجمالي الإيرادات", str(data.get("income_report", {}).get("total_income", "0"))])
    ws_summary.append(["إجمالي المصروفات", str(data.get("expense_report", {}).get("total_expenses", "0"))])
    ws_summary.append(["صافي الربح", str(data.get("expense_report", {}).get("net_profit", "0"))])
    ws_summary.append([])
    
    ws_summary.append(["إحصائيات المرضى"])
    ws_summary.append(["المرضى الجدد", data.get("patient_insights", {}).get("new_patients_count", 0)])
    ws_summary.append(["المرضى المتكررين", data.get("patient_insights", {}).get("recurring_patients_count", 0)])
    ws_summary.append(["متوسط قيمة الزيارة", str(data.get("patient_insights", {}).get("average_visit_value", "0"))])
    
    # Sheet 2: Doctor Performance
    ws_doctors = wb.create_sheet(title="أداء الأطباء")
    ws_doctors.append(["اسم الطبيب", "عدد المرضى", "نسبة عدم الحضور", "نسبة الإشغال", "الإيراد المخلق"])
    for doc in data.get("doctor_performance", []):
        ws_doctors.append([
            doc.get("doctor_name", "—"),
            doc.get("patient_count", 0),
            doc.get("no_show_rate", 0),
            doc.get("occupancy_rate", 0),
            str(doc.get("total_revenue", "0"))
        ])
        
    buffer = io.BytesIO()
    wb.save(buffer)
    buffer.seek(0)
    return buffer.getvalue()


def export_to_pdf(data: Dict[str, Any], filename: str = "dashboard_report.pdf") -> bytes:
    """تحويل بيانات لوحة التحكم إلى ملف PDF باستخدام reportlab"""
    buffer = io.BytesIO()
    c = canvas.Canvas(buffer, pagesize=letter)
    width, height = letter
    
    y = height - 50
    c.setFont("Helvetica-Bold", 16)
    c.drawString(50, y, f"Clinicon Dashboard Report - {filename}")
    
    y -= 30
    c.setFont("Helvetica", 12)
    c.drawString(50, y, f"Total Income: {data.get('income_report', {}).get('total_income', '0')}")
    y -= 20
    c.drawString(50, y, f"Total Expenses: {data.get('expense_report', {}).get('total_expenses', '0')}")
    y -= 20
    c.drawString(50, y, f"Net Profit: {data.get('expense_report', {}).get('net_profit', '0')}")
    
    y -= 40
    c.setFont("Helvetica-Bold", 14)
    c.drawString(50, y, "Doctor Performance Overview:")
    
    y -= 20
    c.setFont("Helvetica", 10)
    for doc in data.get("doctor_performance", []):
        if y < 50:
            c.showPage()
            y = height - 50
        text = f"Doctor: {doc.get('doctor_name')} | Patients: {doc.get('patient_count')} | No-Show Rate: {doc.get('no_show_rate')} | Revenue: {doc.get('total_revenue')}"
        c.drawString(50, y, text)
        y -= 15

    c.showPage()
    c.save()
    buffer.seek(0)
    return buffer.getvalue()

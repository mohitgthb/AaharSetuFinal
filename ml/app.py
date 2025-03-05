from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import pdfkit
from jinja2 import Environment, FileSystemLoader
import os
import io  # Import BytesIO for in-memory file handling

app = Flask(__name__, template_folder=os.path.join(os.path.dirname(__file__), "templates"))
CORS(app)

# Configure the path to wkhtmltopdf
WKHTMLTOPDF_PATH = r'C:\Program Files\wkhtmltopdf\bin\wkhtmltopdf.exe' 
config = pdfkit.configuration(wkhtmltopdf=WKHTMLTOPDF_PATH)

template_dir = os.path.join(os.path.dirname(__file__), 'templates')


@app.route('/generate', methods=['POST'])
def generate_certificate():
    if not request.is_json:
        return jsonify({"error": "Request must be JSON"}), 400

    data = request.get_json()
    recipient_name = data.get('name')

    if not recipient_name:
        return jsonify({"error": "Missing 'name' in request"}), 400

    try:
        # Render HTML template
        env = Environment(loader=FileSystemLoader(template_dir))
        template = env.get_template('certificate_template.html')
        rendered_html = template.render(recipient_name=recipient_name)

        # Generate PDF directly from HTML content (no temporary files)
        pdf_bytes = pdfkit.from_string(rendered_html, False, configuration=config)

        # Create in-memory bytes buffer for the PDF
        pdf_stream = io.BytesIO(pdf_bytes)

        # Send the PDF as a downloadable attachment
        return send_file(
            pdf_stream,
            as_attachment=True,
            download_name='certificate.pdf',
            mimetype='application/pdf'
        )

    except Exception as e:
        app.logger.error(f"Error generating certificate: {str(e)}")
        return jsonify({"error": "Failed to generate certificate", "details": str(e)}), 500

if __name__ == '__main__':
    app.run(host="0.0.0.0", debug=True, port=5002)
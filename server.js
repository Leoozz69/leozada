const express = require('express');
const mercadopago = require('mercadopago');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Configuração do Mercado Pago com token
mercadopago.configurations.setAccessToken('APP_USR-6293224342595769-100422-59d0a4c711e8339398460601ef894665-558785318');

// Middleware para processar JSON e CORS
app.use(express.json());
app.use(cors());

// Endpoint para gerar o QR code PIX
app.post('/api/generate_pix_qr', async (req, res) => {
  try {
    const { name, amount, cpf, email } = req.body;

    // Validação básica dos parâmetros
    if (!name || isNaN(amount) || amount < 0.01 || amount > 10000) {
      return res.status(400).json({ error: 'Parâmetros inválidos' });
    }

    const payment_data = {
      transaction_amount: amount,
      description: 'Doação para o projeto',
      payment_method_id: 'pix',
      notification_url: `${process.env.NOTIFICATION_URL}/api/notifications`, // URL do webhook
      payer: {
        first_name: name,
        last_name: 'Lindo', // Este é opcional, apenas um exemplo
        email: email || 'ogustadesigner@gmail.com',
        identification: {
          type: 'CPF',
          number: cpf || '56402807869'
        }
      }
    };

    const response = await mercadopago.payment.create(payment_data);
    const point_of_interaction = response.body.point_of_interaction;

    if (point_of_interaction && point_of_interaction.transaction_data) {
      const qrCodeBase64 = point_of_interaction.transaction_data.qr_code_base64;
      const pixCode = point_of_interaction.transaction_data.qr_code;
      res.json({ qr_code_base64: qrCodeBase64, pix_code: pixCode });
    } else {
      res.status(500).json({ error: 'Erro ao gerar QR Code PIX' });
    }
  } catch (error) {
    console.error('Erro ao criar pagamento:', error);
    res.status(500).json({ error: 'Erro ao criar pagamento' });
  }
});

// Endpoint para receber notificações do Mercado Pago
app.post('/api/notifications', (req, res) => {
  console.log('Notificação recebida:', req.body);
  res.sendStatus(200); // Confirma que a notificação foi recebida
});

// Inicializa o servidor (não necessário para Vercel)
module.exports = app;

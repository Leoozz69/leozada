const express = require('express');
const mercadopago = require('mercadopago');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Configuração do Mercado Pago com token
mercadopago.configurations.setAccessToken(process.env.ACCESS_TOKEN);

// Middleware para processar JSON e CORS
app.use(express.json());
app.use(cors());

// Serve arquivos estáticos (opcional)
app.use(express.static(path.join(__dirname, 'public')));

// Endpoint para gerar o QR code PIX
app.post('/generate_pix_qr', async (req, res) => {
  try {
    const { name, amount, cpf, email } = req.body;

    // Validação básica dos parâmetros
    if (!name || isNaN(amount) || amount < 0.01 || amount > 10000) {
      return res.status(400).json({ error: 'Parâmetros inválidos' });
    }

    // Dados de pagamento do Mercado Pago
    const payment_data = {
      transaction_amount: amount,
      description: 'Doação para o projeto',
      payment_method_id: 'pix',
      notification_url: 'https://seu-endereco-no-render.com/notifications', // Substitua pela URL do webhook no Render
      payer: {
        first_name: name,
        last_name: 'Lindo', // Pode ser adaptado ou removido
        email: email || 'email_padrao@gmail.com',
        identification: {
          type: 'CPF',
          number: cpf || '56402807869'
        }
      }
    };

    // Criação do pagamento
    const response = await mercadopago.payment.create(payment_data);
    const point_of_interaction = response.body.point_of_interaction;

    if (point_of_interaction && point_of_interaction.transaction_data) {
      const qrCodeBase64 = point_of_interaction.transaction_data.qr_code_base64;
      const pixCode = point_of_interaction.transaction_data.qr_code;

      // Retorno do QR code e código PIX
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
app.post('/notifications', async (req, res) => {
  try {
    const paymentId = req.body.data.id;

    // Consulta o status do pagamento
    const response = await mercadopago.payment.findById(paymentId);
    const paymentStatus = response.body.status;

    if (paymentStatus === 'approved') {
      console.log('Pagamento aprovado!', paymentId);
    }

    res.sendStatus(200); // Confirma que a notificação foi recebida
  } catch (error) {
    console.error('Erro ao processar notificação:', error);
    res.sendStatus(500);
  }
});

// Endpoint de health check
app.get('/healthz', (req, res) => {
  res.status(200).send('OK');
});

// Inicializa o servidor
app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});

# Fábrica de Tabacos

## Iniciar la aplicación en Windows

1. Inicia MySQL (por ejemplo, desde XAMPP o el servicio de Windows) y confirma que `backend\.env` tenga la configuración correcta.
2. Desde la raíz del proyecto, ejecuta en PowerShell:

   ```powershell
   powershell -ExecutionPolicy Bypass -File .\iniciar-aplicacion.ps1
   ```

   El script abre el backend y el frontend en ventanas separadas, reutiliza servicios que ya estén escuchando y comprueba que respondan.
3. Abre [http://localhost:5173/login](http://localhost:5173/login).

Deja abiertas las ventanas del backend y frontend mientras usas la aplicación. Para detenerlos, cierra sus ventanas. Si un servicio no inicia, revisa su ventana: el backend verifica la conexión a MySQL antes de aceptar solicitudes.

Este comando facilita el inicio local de desarrollo; no configura el inicio automático al arrancar Windows ni sustituye un despliegue de producción.

## Clientes

La API de clientes requiere autenticación. `GET /api/clientes` y `GET /api/clientes/:id` permiten consultar el catálogo; los roles `admin` y `bodega` pueden crear y editar, y solo `admin` puede desactivar clientes.

Campos para `POST /api/clientes`:

```json
{
  "nombre": "Nombre del cliente",
  "tipo_documento": "CC",
  "numero_documento": "123456789",
  "telefono": "3001234567",
  "email": "cliente@example.com",
  "direccion": "Dirección opcional"
}
```

`tipo_documento` acepta `NIT`, `CC`, `CE` o `RUC`; el número de documento debe ser único. Para instalaciones existentes, aplica `backend/database/migrations/20261110_create_clientes.sql` una vez. La migración no elimina datos.
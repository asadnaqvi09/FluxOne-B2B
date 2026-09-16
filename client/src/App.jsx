import { AppRouter } from '@/router/index'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import { BRAND } from '@/lib/constants'

function App() {
  return (
    <>
      <AppRouter />
      <ToastContainer
        position="top-right"
        autoClose={2800}
        newestOnTop
        closeOnClick
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
        style={{ zIndex: 99999, top: '4.35rem' }}
        toastStyle={{
          fontFamily: 'inherit',
          borderRadius: '12px',
          boxShadow: '0 8px 24px rgba(65, 34, 131, 0.14)',
        }}
        progressStyle={{ background: BRAND.purple }}
      />
    </>
  )
}

export default App

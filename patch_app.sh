sed -i '/const LogisticsApiDocs = /i const ApiDocs = lazy(() => import('\''./pages/docs/ApiDocs'\''));' src/App.tsx
sed -i '/<Route path="\/docs\/logistics" /i \          <Route path="/docs" element={<ApiDocs />} />' src/App.tsx

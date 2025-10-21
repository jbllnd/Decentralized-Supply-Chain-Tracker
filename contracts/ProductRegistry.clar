(define-constant ERR-NOT-AUTHORIZED u100)
(define-constant ERR-INVALID-PRODUCT-NAME u101)
(define-constant ERR-INVALID-MAX-QUANTITY u102)
(define-constant ERR-INVALID-ORIGIN u103)
(define-constant ERR-INVALID-BATCH-ID u104)
(define-constant ERR-INVALID-DESCRIPTION u105)
(define-constant ERR-PRODUCT-ALREADY-EXISTS u106)
(define-constant ERR-PRODUCT-NOT-FOUND u107)
(define-constant ERR-INVALID-TIMESTAMP u108)
(define-constant ERR-AUTHORITY-NOT-VERIFIED u109)
(define-constant ERR-INVALID-MIN-QUANTITY u110)
(define-constant ERR-INVALID-EXPIRY u111)
(define-constant ERR-PRODUCT-UPDATE-NOT-ALLOWED u112)
(define-constant ERR-INVALID-UPDATE-PARAM u113)
(define-constant ERR-MAX-PRODUCTS-EXCEEDED u114)
(define-constant ERR-INVALID-PRODUCT-TYPE u115)
(define-constant ERR-INVALID-CATEGORY u116)
(define-constant ERR-INVALID-LOCATION u117)
(define-constant ERR-INVALID-CURRENCY u118)
(define-constant ERR-INVALID-STATUS u119)
(define-constant ERR-INVALID-HASH u120)
(define-constant ERR-INVALID-WEIGHT u121)
(define-constant ERR-INVALID-DIMENSIONS u122)
(define-constant ERR-INVALID-MATERIAL u123)
(define-constant ERR-INVALID-CERTIFICATION u124)

(define-data-var next-product-id uint u0)
(define-data-var max-products uint u10000)
(define-data-var creation-fee uint u500)
(define-data-var authority-contract (optional principal) none)

(define-map products
  uint
  {
    name: (string-utf8 100),
    hash: (buff 32),
    max-quantity: uint,
    origin: (string-utf8 100),
    batch-id: (string-utf8 50),
    description: (string-utf8 500),
    timestamp: uint,
    creator: principal,
    product-type: (string-utf8 50),
    category: (string-utf8 50),
    location: (string-utf8 100),
    currency: (string-utf8 20),
    status: bool,
    min-quantity: uint,
    expiry: uint,
    weight: uint,
    dimensions: (string-utf8 50),
    material: (string-utf8 100),
    certification: (string-utf8 100)
  }
)

(define-map products-by-name
  (string-utf8 100)
  uint)

(define-map products-by-hash
  (buff 32)
  uint)

(define-map product-updates
  uint
  {
    update-name: (string-utf8 100),
    update-max-quantity: uint,
    update-description: (string-utf8 500),
    update-timestamp: uint,
    updater: principal
  }
)

(define-read-only (get-product (id uint))
  (map-get? products id)
)

(define-read-only (get-product-updates (id uint))
  (map-get? product-updates id)
)

(define-read-only (is-product-registered (name (string-utf8 100)))
  (is-some (map-get? products-by-name name))
)

(define-read-only (get-product-by-hash (hash (buff 32)))
  (map-get? products-by-hash hash)
)

(define-private (validate-name (name (string-utf8 100)))
  (if (and (> (len name) u0) (<= (len name) u100))
      (ok true)
      (err ERR-INVALID-PRODUCT-NAME))
)

(define-private (validate-hash (hash (buff 32)))
  (if (is-eq (len hash) u32)
      (ok true)
      (err ERR-INVALID-HASH))
)

(define-private (validate-max-quantity (quantity uint))
  (if (> quantity u0)
      (ok true)
      (err ERR-INVALID-MAX-QUANTITY))
)

(define-private (validate-origin (origin (string-utf8 100)))
  (if (and (> (len origin) u0) (<= (len origin) u100))
      (ok true)
      (err ERR-INVALID-ORIGIN))
)

(define-private (validate-batch-id (batch (string-utf8 50)))
  (if (and (> (len batch) u0) (<= (len batch) u50))
      (ok true)
      (err ERR-INVALID-BATCH-ID))
)

(define-private (validate-description (desc (string-utf8 500)))
  (if (<= (len desc) u500)
      (ok true)
      (err ERR-INVALID-DESCRIPTION))
)

(define-private (validate-timestamp (ts uint))
  (if (>= ts block-height)
      (ok true)
      (err ERR-INVALID-TIMESTAMP))
)

(define-private (validate-product-type (type (string-utf8 50)))
  (if (or (is-eq type "electronics") (is-eq type "food") (is-eq type "clothing") (is-eq type "machinery"))
      (ok true)
      (err ERR-INVALID-PRODUCT-TYPE))
)

(define-private (validate-category (cat (string-utf8 50)))
  (if (and (> (len cat) u0) (<= (len cat) u50))
      (ok true)
      (err ERR-INVALID-CATEGORY))
)

(define-private (validate-location (loc (string-utf8 100)))
  (if (and (> (len loc) u0) (<= (len loc) u100))
      (ok true)
      (err ERR-INVALID-LOCATION))
)

(define-private (validate-currency (cur (string-utf8 20)))
  (if (or (is-eq cur "STX") (is-eq cur "USD") (is-eq cur "BTC"))
      (ok true)
      (err ERR-INVALID-CURRENCY))
)

(define-private (validate-min-quantity (min uint))
  (if (> min u0)
      (ok true)
      (err ERR-INVALID-MIN-QUANTITY))
)

(define-private (validate-expiry (exp uint))
  (if (> exp block-height)
      (ok true)
      (err ERR-INVALID-EXPIRY))
)

(define-private (validate-weight (w uint))
  (if (> w u0)
      (ok true)
      (err ERR-INVALID-WEIGHT))
)

(define-private (validate-dimensions (dim (string-utf8 50)))
  (if (<= (len dim) u50)
      (ok true)
      (err ERR-INVALID-DIMENSIONS))
)

(define-private (validate-material (mat (string-utf8 100)))
  (if (<= (len mat) u100)
      (ok true)
      (err ERR-INVALID-MATERIAL))
)

(define-private (validate-certification (cert (string-utf8 100)))
  (if (<= (len cert) u100)
      (ok true)
      (err ERR-INVALID-CERTIFICATION))
)

(define-private (validate-principal (p principal))
  (if (not (is-eq p 'SP000000000000000000002Q6VF78))
      (ok true)
      (err ERR-NOT-AUTHORIZED))
)

(define-public (set-authority-contract (contract-principal principal))
  (begin
    (try! (validate-principal contract-principal))
    (asserts! (is-none (var-get authority-contract)) (err ERR-AUTHORITY-NOT-VERIFIED))
    (var-set authority-contract (some contract-principal))
    (ok true)
  )
)

(define-public (set-max-products (new-max uint))
  (begin
    (asserts! (> new-max u0) (err ERR-INVALID-UPDATE-PARAM))
    (asserts! (is-some (var-get authority-contract)) (err ERR-AUTHORITY-NOT-VERIFIED))
    (var-set max-products new-max)
    (ok true)
  )
)

(define-public (set-creation-fee (new-fee uint))
  (begin
    (asserts! (>= new-fee u0) (err ERR-INVALID-UPDATE-PARAM))
    (asserts! (is-some (var-get authority-contract)) (err ERR-AUTHORITY-NOT-VERIFIED))
    (var-set creation-fee new-fee)
    (ok true)
  )
)

(define-public (create-product
  (product-name (string-utf8 100))
  (product-hash (buff 32))
  (max-quantity uint)
  (origin (string-utf8 100))
  (batch-id (string-utf8 50))
  (description (string-utf8 500))
  (product-type (string-utf8 50))
  (category (string-utf8 50))
  (location (string-utf8 100))
  (currency (string-utf8 20))
  (min-quantity uint)
  (expiry uint)
  (weight uint)
  (dimensions (string-utf8 50))
  (material (string-utf8 100))
  (certification (string-utf8 100))
)
  (let (
        (next-id (var-get next-product-id))
        (current-max (var-get max-products))
        (authority (var-get authority-contract))
      )
    (asserts! (< next-id current-max) (err ERR-MAX-PRODUCTS-EXCEEDED))
    (try! (validate-name product-name))
    (try! (validate-hash product-hash))
    (try! (validate-max-quantity max-quantity))
    (try! (validate-origin origin))
    (try! (validate-batch-id batch-id))
    (try! (validate-description description))
    (try! (validate-product-type product-type))
    (try! (validate-category category))
    (try! (validate-location location))
    (try! (validate-currency currency))
    (try! (validate-min-quantity min-quantity))
    (try! (validate-expiry expiry))
    (try! (validate-weight weight))
    (try! (validate-dimensions dimensions))
    (try! (validate-material material))
    (try! (validate-certification certification))
    (asserts! (is-none (map-get? products-by-name product-name)) (err ERR-PRODUCT-ALREADY-EXISTS))
    (asserts! (is-none (map-get? products-by-hash product-hash)) (err ERR-PRODUCT-ALREADY-EXISTS))
    (let ((authority-recipient (unwrap! authority (err ERR-AUTHORITY-NOT-VERIFIED))))
      (try! (stx-transfer? (var-get creation-fee) tx-sender authority-recipient))
    )
    (map-set products next-id
      {
        name: product-name,
        hash: product-hash,
        max-quantity: max-quantity,
        origin: origin,
        batch-id: batch-id,
        description: description,
        timestamp: block-height,
        creator: tx-sender,
        product-type: product-type,
        category: category,
        location: location,
        currency: currency,
        status: true,
        min-quantity: min-quantity,
        expiry: expiry,
        weight: weight,
        dimensions: dimensions,
        material: material,
        certification: certification
      }
    )
    (map-set products-by-name product-name next-id)
    (map-set products-by-hash product-hash next-id)
    (var-set next-product-id (+ next-id u1))
    (print { event: "product-created", id: next-id })
    (ok next-id)
  )
)

(define-public (update-product
  (product-id uint)
  (update-name (string-utf8 100))
  (update-max-quantity uint)
  (update-description (string-utf8 500))
)
  (let ((product (map-get? products product-id)))
    (match product
      p
        (begin
          (asserts! (is-eq (get creator p) tx-sender) (err ERR-NOT-AUTHORIZED))
          (try! (validate-name update-name))
          (try! (validate-max-quantity update-max-quantity))
          (try! (validate-description update-description))
          (let ((existing (map-get? products-by-name update-name)))
            (match existing
              existing-id
                (asserts! (is-eq existing-id product-id) (err ERR-PRODUCT-ALREADY-EXISTS))
              (begin true)
            )
          )
          (let ((old-name (get name p)))
            (if (is-eq old-name update-name)
                (ok true)
                (begin
                  (map-delete products-by-name old-name)
                  (map-set products-by-name update-name product-id)
                  (ok true)
                )
            )
          )
          (map-set products product-id
            {
              name: update-name,
              hash: (get hash p),
              max-quantity: update-max-quantity,
              origin: (get origin p),
              batch-id: (get batch-id p),
              description: update-description,
              timestamp: block-height,
              creator: (get creator p),
              product-type: (get product-type p),
              category: (get category p),
              location: (get location p),
              currency: (get currency p),
              status: (get status p),
              min-quantity: (get min-quantity p),
              expiry: (get expiry p),
              weight: (get weight p),
              dimensions: (get dimensions p),
              material: (get material p),
              certification: (get certification p)
            }
          )
          (map-set product-updates product-id
            {
              update-name: update-name,
              update-max-quantity: update-max-quantity,
              update-description: update-description,
              update-timestamp: block-height,
              updater: tx-sender
            }
          )
          (print { event: "product-updated", id: product-id })
          (ok true)
        )
      (err ERR-PRODUCT-NOT-FOUND)
    )
  )
)

(define-public (get-product-count)
  (ok (var-get next-product-id))
)

(define-public (check-product-existence (name (string-utf8 100)))
  (ok (is-product-registered name))
)
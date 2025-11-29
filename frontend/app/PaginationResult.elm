module PaginationResult exposing (Model, decode)

import Json.Decode


type alias Model x =
    { items : List x, pages : Int }


decode : Json.Decode.Decoder x -> Json.Decode.Decoder (Model x)
decode itemDecoder =
    Json.Decode.map2 Model
        (Json.Decode.field "data" (Json.Decode.list itemDecoder))
        (Json.Decode.field "pages" Json.Decode.int)

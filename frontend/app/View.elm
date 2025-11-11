module View exposing (View, map)

{-|

@docs View, map

-}

import Html exposing (Html)


{-| -}
type alias View msg =
    { title : Maybe String
    , documentTitle : String
    , body : List (Html msg)
    }


{-| -}
map : (msg1 -> msg2) -> View msg1 -> View msg2
map fn doc =
    { title = doc.title
    , documentTitle = doc.documentTitle
    , body = List.map (Html.map fn) doc.body
    }

module Book exposing (..)

import Json.Decode
import Serializer.Json.Extra


type Book
    = Rated Model Rating
    | Unrated Model


type alias Model =
    { title : String
    , author : String
    , year : Int
    , lifeSpan : Maybe String
    }


type alias Rating =
    { avgRating : Float
    , ratings : Int
    , bookUrl : String
    , imageId : String
    }


decodeUnrated : Json.Decode.Decoder Book
decodeUnrated =
    (Json.Decode.succeed Model
        |> Serializer.Json.Extra.andMap (Json.Decode.field "title" Json.Decode.string)
        |> Serializer.Json.Extra.andMap (Json.Decode.field "author" Json.Decode.string)
        |> Serializer.Json.Extra.andMap (Json.Decode.field "year" Json.Decode.int)
        |> Serializer.Json.Extra.andMap (Json.Decode.field "lifeSpan" (Json.Decode.maybe Json.Decode.string))
    )
        |> Json.Decode.map Unrated


decodeRated : Json.Decode.Decoder Book
decodeRated =
    Json.Decode.succeed (\title author year lifeSpan avgRating ratings bookUrl imageId -> Rated (Model title author year lifeSpan) (Rating avgRating ratings bookUrl imageId))
        |> Serializer.Json.Extra.andMap (Json.Decode.field "title" Json.Decode.string)
        |> Serializer.Json.Extra.andMap (Json.Decode.field "author" Json.Decode.string)
        |> Serializer.Json.Extra.andMap (Json.Decode.field "year" Json.Decode.int)
        |> Serializer.Json.Extra.andMap (Json.Decode.field "lifeSpan" (Json.Decode.maybe Json.Decode.string))
        |> Serializer.Json.Extra.andMap (Json.Decode.field "avgRating" Json.Decode.float)
        |> Serializer.Json.Extra.andMap (Json.Decode.field "ratings" Json.Decode.int)
        |> Serializer.Json.Extra.andMap (Json.Decode.field "bookUrl" Json.Decode.string)
        |> Serializer.Json.Extra.andMap (Json.Decode.field "imageId" Json.Decode.string)

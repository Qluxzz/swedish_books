module Book exposing (..)

import Html
import Html.Attributes
import Json.Decode
import Route
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


decode : Json.Decode.Decoder Book
decode =
    Json.Decode.succeed
        (\title author year lifeSpan avgRating ratings bookUrl imageId ->
            Maybe.map4
                (\avg r bUrl iId ->
                    Rated (Model title author year lifeSpan) (Rating avg r bUrl iId)
                )
                avgRating
                ratings
                bookUrl
                imageId
                |> Maybe.withDefault (Unrated (Model title author year lifeSpan))
        )
        |> Serializer.Json.Extra.andMap (Json.Decode.field "title" Json.Decode.string)
        |> Serializer.Json.Extra.andMap (Json.Decode.field "author" Json.Decode.string)
        |> Serializer.Json.Extra.andMap (Json.Decode.field "year" Json.Decode.int)
        |> Serializer.Json.Extra.andMap (Json.Decode.field "lifeSpan" (Json.Decode.maybe Json.Decode.string))
        |> Serializer.Json.Extra.andMap (Json.Decode.maybe (Json.Decode.field "avgRating" Json.Decode.float))
        |> Serializer.Json.Extra.andMap (Json.Decode.maybe (Json.Decode.field "ratings" Json.Decode.int))
        |> Serializer.Json.Extra.andMap (Json.Decode.maybe (Json.Decode.field "bookUrl" Json.Decode.string))
        |> Serializer.Json.Extra.andMap (Json.Decode.maybe (Json.Decode.field "imageId" Json.Decode.string))


view : Book -> Html.Html msg
view book =
    case book of
        Rated b r ->
            Html.article [ Html.Attributes.class "book-card" ]
                [ Html.div [ Html.Attributes.class "book-cover " ] [ Html.a [ Html.Attributes.href <| "https://www.goodreads.com" ++ r.bookUrl, Html.Attributes.target "_blank" ] [ Html.img [ Html.Attributes.src <| "https://i.gr-assets.com/images/S/compressed.photo.goodreads.com/books/" ++ r.imageId ++ "._SX200_.jpg", Html.Attributes.alt <| "Omslag för " ++ b.title ] [] ] ]
                , Html.div [ Html.Attributes.class "book-info" ]
                    [ Html.div [ Html.Attributes.class "book-details" ]
                        [ Html.a [ Html.Attributes.href <| "https://www.goodreads.com" ++ r.bookUrl, Html.Attributes.target "_blank" ] [ Html.h3 [ Html.Attributes.class "book-title" ] [ Html.text b.title ] ]
                        , Html.p [ Html.Attributes.class "book-author" ] [ Html.text <| b.author, lifeSpanView b.lifeSpan ]
                        ]
                    , Html.hr [] []
                    , Html.div [ Html.Attributes.class "book-meta" ]
                        [ Html.a [ Html.Attributes.href (Route.toString (Route.Year__Number_ { number = String.fromInt b.year })) ] [ Html.span [ Html.Attributes.class "book-year" ] [ Html.text <| String.fromInt b.year ] ]
                        , Html.div [ Html.Attributes.class "book-rating" ]
                            [ Html.img [ Html.Attributes.class "rating-star", Html.Attributes.src "../star.svg" ] []
                            , Html.span [ Html.Attributes.class "rating-value" ] [ Html.text <| String.fromFloat r.avgRating ++ " (" ++ String.fromInt r.ratings ++ ")" ]
                            ]
                        ]
                    ]
                ]

        Unrated b ->
            Html.article [ Html.Attributes.class "book-card" ]
                [ Html.div [ Html.Attributes.class "book-info" ]
                    [ Html.div [ Html.Attributes.class "book-details" ]
                        [ Html.a [ Html.Attributes.href <| "https://libris.kb.se/formatQuery.jsp?SEARCH_ALL=" ++ b.title ++ " " ++ b.author ++ "&d=libris&f=simp&spell=true" ] [ Html.h3 [ Html.Attributes.class "book-title" ] [ Html.text b.title ] ] ]
                    , Html.p [ Html.Attributes.class "book-author" ] [ Html.text <| b.author, lifeSpanView b.lifeSpan ]
                    , Html.hr [] []
                    , Html.div [ Html.Attributes.class "book-meta" ]
                        [ Html.a [ Html.Attributes.href (Route.toString (Route.Year__Number_ { number = String.fromInt b.year })) ] [ Html.span [ Html.Attributes.class "book-year" ] [ Html.text <| String.fromInt b.year ] ]
                        ]
                    ]
                ]


lifeSpanView : Maybe String -> Html.Html msg
lifeSpanView s =
    Html.text <|
        case s of
            Nothing ->
                ""

            Just s2 ->
                "(" ++ s2 ++ ")"

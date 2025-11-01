module Book exposing (Book, ViewOptions, decode, lifeSpanView, view)

import Dict
import Head.Seo exposing (book)
import Html
import Html.Attributes
import Json.Decode
import Route
import Serializer.Json.Extra
import Shared


type Book
    = Rated Model Rating
    | Unrated Model


type alias Model =
    { title : String
    , author : Author
    , year : Int
    , isbn : Maybe String
    , imageUrl : Maybe String
    }


type alias Author =
    { id : Int, name : String, slug : String, lifeSpan : Maybe String }


type alias Rating =
    { avgRating : Float
    , ratings : Int
    , bookUrl : String
    }


imageHostToUrl : Dict.Dict String String
imageHostToUrl =
    Dict.fromList
        [ ( "tomasgift"
          , "https://xinfo.libris.kb.se/xinfo/getxinfo?identifier=/PICTURE/tomasgift/libris-bib/{ID}/{ID}/orginal"
          )
        , ( "digi", "https://xinfo.libris.kb.se/xinfo/getxinfo?identifier=/PICTURE/digi/libris-bib/{ID}/{ID}.jpg/orginal" )
        , ( "bokrondellen"
          , "https://xinfo.libris.kb.se/xinfo/getxinfo?identifier=/PICTURE/bokrondellen/isbn/{ID}/{ID}.jpg/orginal"
          )
        , ( "author"
          , "https://xinfo.libris.kb.se/xinfo/getxinfo?identifier=/PICTURE/author/libris-bib/{ID}/{ID}.jpg/orginal"
          )
        , ( "goodreads"
          , "https://i.gr-assets.com/images/S/compressed.photo.goodreads.com/books/{ID}._SX200_.jpg"
          )
        ]


toImageUrl : String -> String -> Maybe String
toImageUrl host id =
    imageHostToUrl
        |> Dict.get host
        |> Maybe.map (String.replace "{ID}" id)


decode : Json.Decode.Decoder Book
decode =
    Json.Decode.succeed
        (\title authorId authorName authorSlug lifeSpan year isbn avgRating ratings bookUrl imageHost imageId ->
            let
                author : Author
                author =
                    { id = authorId, name = authorName, slug = authorSlug, lifeSpan = lifeSpan }

                imageUrl =
                    Maybe.map2 toImageUrl imageHost imageId
                        |> Maybe.andThen identity

                model =
                    Model title author year isbn imageUrl
            in
            Maybe.map3
                (\avg r bUrl ->
                    Rated model (Rating avg r bUrl)
                )
                avgRating
                ratings
                bookUrl
                |> Maybe.withDefault (Unrated model)
        )
        |> Serializer.Json.Extra.andMap (Json.Decode.field "title" Json.Decode.string)
        |> Serializer.Json.Extra.andMap (Json.Decode.field "author_id" Json.Decode.int)
        |> Serializer.Json.Extra.andMap (Json.Decode.field "author_name" Json.Decode.string)
        |> Serializer.Json.Extra.andMap (Json.Decode.field "author_slug" Json.Decode.string)
        |> Serializer.Json.Extra.andMap (Json.Decode.maybe (Json.Decode.field "author_life_span" Json.Decode.string))
        |> Serializer.Json.Extra.andMap (Json.Decode.field "year" Json.Decode.int)
        |> Serializer.Json.Extra.andMap (Json.Decode.maybe (Json.Decode.field "isbn" Json.Decode.string))
        |> Serializer.Json.Extra.andMap (Json.Decode.maybe (Json.Decode.field "avg_rating" Json.Decode.float))
        |> Serializer.Json.Extra.andMap (Json.Decode.maybe (Json.Decode.field "ratings" Json.Decode.int))
        |> Serializer.Json.Extra.andMap (Json.Decode.maybe (Json.Decode.field "book_url" Json.Decode.string))
        |> Serializer.Json.Extra.andMap (Json.Decode.maybe (Json.Decode.field "image_host" Json.Decode.string))
        |> Serializer.Json.Extra.andMap (Json.Decode.maybe (Json.Decode.field "image_id" Json.Decode.string))


type alias ViewOptions =
    { linkToAuthor : Bool, linkToYear : Bool }


view : ViewOptions -> Book -> Html.Html msg
view { linkToAuthor, linkToYear } book =
    let
        url =
            case book of
                Rated _ r ->
                    "https://www.goodreads.com" ++ r.bookUrl

                Unrated b ->
                    "https://libris.kb.se/formatQuery.jsp?SEARCH_ALL=" ++ b.title ++ " " ++ b.author.name ++ "&d=libris&f=simp&spell=true"

        baseModel =
            case book of
                Rated b _ ->
                    b

                Unrated b ->
                    b

        image =
            case baseModel.imageUrl of
                Just u ->
                    Html.div [ Html.Attributes.class "book-cover " ]
                        [ Html.a [ Html.Attributes.href url ] [ Html.img [ Html.Attributes.src u, Html.Attributes.alt <| "Omslag för " ++ baseModel.title ] [] ] ]

                Nothing ->
                    Html.text ""
    in
    case book of
        Rated b r ->
            Html.article [ Html.Attributes.class "book-card" ]
                [ image
                , Html.div [ Html.Attributes.class "book-info" ]
                    [ Html.div [ Html.Attributes.class "book-details" ]
                        [ Shared.externalLink [ Html.Attributes.href url ] [ Html.h3 [ Html.Attributes.class "book-title" ] [ Html.text b.title ] ]
                        , bookAuthor linkToAuthor b.author
                        ]
                    , Html.hr [] []
                    , Html.div [ Html.Attributes.class "book-meta" ]
                        [ yearView b.year linkToYear
                        , Html.div [ Html.Attributes.class "book-rating" ]
                            [ Html.img [ Html.Attributes.class "rating-star", Html.Attributes.src "/star.svg" ] []
                            , Html.span [ Html.Attributes.class "rating-value" ] [ Html.text <| String.fromFloat r.avgRating ++ " (" ++ String.fromInt r.ratings ++ ")" ]
                            ]
                        ]
                    ]
                ]

        Unrated b ->
            Html.article [ Html.Attributes.class "book-card" ]
                [ image
                , Html.div [ Html.Attributes.class "book-info" ]
                    [ Html.div [ Html.Attributes.class "book-details" ]
                        [ Shared.externalLink [ Html.Attributes.href url ] [ Html.h3 [ Html.Attributes.class "book-title" ] [ Html.text b.title ] ] ]
                    , bookAuthor linkToAuthor b.author
                    , Html.hr [] []
                    , Html.div [ Html.Attributes.class "book-meta" ]
                        [ yearView b.year linkToYear ]
                    ]
                ]


bookAuthor : Bool -> Author -> Html.Html msg
bookAuthor linkToAuthor { id, name, slug, lifeSpan } =
    let
        displayName =
            Html.text <| ([ Just name, lifeSpanView lifeSpan ] |> List.filterMap identity |> String.join " ")
    in
    if linkToAuthor then
        Html.a [ Html.Attributes.href (Route.toString (Route.Author__Id___Name_ { id = String.fromInt id, name = slug })), Html.Attributes.class "book-author" ] [ displayName ]

    else
        Html.span [] [ displayName ]


lifeSpanView : Maybe String -> Maybe String
lifeSpanView =
    Maybe.map (\s -> "(" ++ s ++ ")")


yearView : Int -> Bool -> Html.Html msg
yearView year createLink =
    let
        y =
            Html.span [ Html.Attributes.class "book-year" ] [ Html.text <| String.fromInt year ]
    in
    if createLink then
        Html.a [ Html.Attributes.href (Route.toString (Route.Year__Number_ { number = String.fromInt year })) ] [ y ]

    else
        y
